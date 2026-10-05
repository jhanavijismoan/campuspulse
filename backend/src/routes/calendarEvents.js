'use strict';
const { Router } = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { createNotificationBulk } = require('../lib/notifications');

const router = Router();

// Reuse audience matching from announcements (inline simple version)
function audienceMatches(audience, user) {
  if (!audience) return true;
  const low = audience.toLowerCase();
  if (/\b(all|everyone|all students)\b/.test(low)) return true;
  let ok = true;
  const semMap = { i: 'Sem 1', ii: 'Sem 3', iii: 'Sem 5', iv: 'Sem 7' };
  const roman = low.match(/\b(iv|iii|ii|i)\b/);
  if (roman && semMap[roman[1]] && user.semester !== semMap[roman[1]]) ok = false;
  const prog = low.match(/\b(bba|bcom|mba|bca|bsc|ba)\b/);
  if (prog && user.program && user.program.toLowerCase() !== prog[1]) ok = false;
  const sec = (low.match(/section\s+([a-e])/i) || low.match(/\bsec\s+([a-e])\b/i));
  if (sec && user.section && user.section.toLowerCase() !== `section ${sec[1].toLowerCase()}`) ok = false;
  return ok;
}

// GET /api/calendar-events — admin: all; student: published + matching audience
router.get('/', requireAuth, async (req, res) => {
  const { from, to } = req.query;
  try {
    const params = [req.user.university_id];
    let q = `SELECT * FROM calendar_events WHERE university_id = $1`;
    if (req.user.role !== 'admin') {
      q += ` AND published = true`;
    }
    if (from) { params.push(from); q += ` AND event_date >= $${params.length}`; }
    if (to)   { params.push(to);   q += ` AND event_date <= $${params.length}`; }
    q += ` ORDER BY event_date ASC, start_time ASC NULLS LAST`;
    const { rows } = await pool.query(q, params);

    // For students: filter by audience in JS (simpler than complex SQL)
    const result = req.user.role !== 'admin'
      ? rows.filter(e => audienceMatches(e.audience, req.user))
      : rows;
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load calendar events' });
  }
});

// POST /api/calendar-events — admin only
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, event_type, event_date, start_time, end_time,
          location, audience, published, notify_students } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'title and event_date are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO calendar_events
         (university_id, created_by, title, description, event_type, event_date, start_time,
          end_time, location, audience, published, notify_students)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.university_id, req.user.id, title, description || null,
       event_type || 'general', event_date, start_time || null, end_time || null,
       location || null, audience || null, !!published, !!notify_students]
    );
    const ev = rows[0];
    if (ev.published && ev.notify_students) {
      sendEventNotifications(ev).catch(console.error);
    }
    res.status(201).json(ev);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PATCH /api/calendar-events/:id
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, event_type, event_date, start_time, end_time,
          location, audience, published, notify_students } = req.body;
  try {
    const { rows: [existing] } = await pool.query(
      `SELECT * FROM calendar_events WHERE id = $1 AND university_id = $2`,
      [req.params.id, req.user.university_id]
    );
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const { rows } = await pool.query(
      `UPDATE calendar_events SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         event_type = COALESCE($3, event_type),
         event_date = COALESCE($4, event_date),
         start_time = COALESCE($5, start_time),
         end_time = COALESCE($6, end_time),
         location = COALESCE($7, location),
         audience = COALESCE($8, audience),
         published = COALESCE($9, published),
         notify_students = COALESCE($10, notify_students),
         updated_at = now()
       WHERE id = $11 AND university_id = $12 RETURNING *`,
      [title, description, event_type, event_date, start_time, end_time,
       location, audience, published, notify_students,
       req.params.id, req.user.university_id]
    );
    const ev = rows[0];

    // Send notifications when publishing for the first time
    const justPublished = ev.published && !existing.published;
    if (justPublished && ev.notify_students && !ev.notification_sent_at) {
      sendEventNotifications(ev).catch(console.error);
    }
    res.json(ev);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/calendar-events/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM calendar_events WHERE id = $1 AND university_id = $2`,
      [req.params.id, req.user.university_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST /api/calendar-events/:id/publish
router.post('/:id/publish', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE calendar_events SET published = true, updated_at = now()
       WHERE id = $1 AND university_id = $2 RETURNING *`,
      [req.params.id, req.user.university_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const ev = rows[0];
    if (ev.notify_students && !ev.notification_sent_at) {
      sendEventNotifications(ev).catch(console.error);
    }
    res.json(ev);
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish' });
  }
});

// POST /api/calendar-events/:id/unpublish
router.post('/:id/unpublish', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE calendar_events SET published = false, updated_at = now()
       WHERE id = $1 AND university_id = $2 RETURNING *`,
      [req.params.id, req.user.university_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to unpublish' });
  }
});

async function sendEventNotifications(ev) {
  // Build audience filter
  let where = `role = 'student'`;
  const aParams = [ev.university_id];

  if (ev.audience) {
    const low = ev.audience.toLowerCase();
    const semMap = { i: 'Sem 1', ii: 'Sem 3', iii: 'Sem 5', iv: 'Sem 7' };
    const roman = low.match(/\b(iv|iii|ii|i)\b/);
    if (roman && semMap[roman[1]]) {
      aParams.push(semMap[roman[1]]);
      where += ` AND semester = $${aParams.length}`;
    }
    const prog = low.match(/\b(bba|bcom|mba|bca|bsc|ba)\b/);
    if (prog) {
      aParams.push(prog[1].toUpperCase());
      where += ` AND program ILIKE $${aParams.length}`;
    }
  }

  const { rows: users } = await pool.query(
    `SELECT id FROM users WHERE university_id = $1 AND ${where}`,
    aParams
  );
  if (!users.length) return;

  await createNotificationBulk(users.map(u => u.id), {
    title: `📅 ${ev.title}`,
    body: `Scheduled for ${ev.event_date}${ev.location ? ` at ${ev.location}` : ''}`,
    severity: ev.event_type === 'exam' ? 'warning' : 'info',
    action_url: '/calendar',
    related_type: 'calendar_event',
    related_id: ev.id,
  });

  await pool.query(
    `UPDATE calendar_events SET notification_sent_at = now() WHERE id = $1`,
    [ev.id]
  );
}

module.exports = router;
