'use strict';
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generateJSON, isAiConfigured } = require('../lib/ai');
const { createNotificationBulk } = require('../lib/notifications');

const router = express.Router();

// ── Audience matching ─────────────────────────────────────────────────────────
const ROMAN_SEM = { i: 'Sem 1', ii: 'Sem 3', iii: 'Sem 5', iv: 'Sem 7' };

function audienceToUserFilter(audience, startParam = 1) {
  if (!audience) return { where: `role = 'student'`, params: [] };

  const low = audience.toLowerCase().trim();
  const params = [];
  const idx = (n) => `$${startParam + n - 1}`;

  if (/\b(staff|admin|council|faculty)\b/.test(low)) {
    return { where: `role = 'admin'`, params: [] };
  }
  if (/\b(all|everyone)\b/.test(low) || low === 'all students') {
    return { where: `role = 'student'`, params: [] };
  }

  const clauses = [`role = 'student'`];

  const romanMatch = low.match(/\b(iv|iii|ii|i)\b/);
  if (romanMatch) {
    const sem = ROMAN_SEM[romanMatch[1]];
    if (sem) { params.push(sem); clauses.push(`semester = ${idx(params.length)}`); }
  }

  const programMatch = low.match(/\b(bba|bcom|b\.com|mba|mcom|bca|bsc|ba)\b/);
  if (programMatch) {
    const prog = programMatch[1].replace('b.com', 'bcom').toUpperCase()
      .replace('BCOM', 'BCom').replace('BBA', 'BBA');
    params.push(prog);
    clauses.push(`program ILIKE ${idx(params.length)}`);
  }

  const sectionMatch = low.match(/section\s+([a-e])/i) || low.match(/\bsec\s+([a-e])\b/i);
  if (sectionMatch) {
    params.push(`Section ${sectionMatch[1].toUpperCase()}`);
    clauses.push(`section = ${idx(params.length)}`);
  }

  if (!romanMatch) {
    const semMatch = low.match(/\bsem(?:ester)?\s*(\d)\b/);
    if (semMatch) {
      params.push(`Sem ${semMatch[1]}`);
      clauses.push(`semester = ${idx(params.length)}`);
    }
  }

  return { where: clauses.join(' AND '), params };
}

// ── Rules-based extraction fallback ──────────────────────────────────────────
function mockExtractAnnouncement(rawText) {
  const lower = rawText.toLowerCase();
  const priority = /\b(urgent|immediately|deadline)\b/.test(lower) ? 'High'
    : /\b(reminder|important)\b/.test(lower) ? 'Medium' : 'Low';
  const audienceMatch = rawText.match(/Students of ([A-Za-z0-9 ]+?)(?:\s+are|\s+must|,|\.)/i);
  const audience = audienceMatch ? `${audienceMatch[1].trim()} Students` : 'All Students';
  const dateMatch = rawText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?)/);
  const firstSentence = rawText.split(/\.\s/)[0];
  const title = firstSentence.length > 80 ? firstSentence.slice(0, 77) + '...' : firstSentence;
  const actionMatch = rawText.match(/must ([^.]+)\./i);
  return {
    title, audience,
    action: actionMatch ? actionMatch[1].trim() : 'Review the announcement details',
    event_date_text: dateMatch ? dateMatch[1] : null,
    priority,
  };
}

// ── Process raw text (AI extraction) ─────────────────────────────────────────
router.post('/process', requireAuth, requireAdmin, async (req, res) => {
  const { raw_text } = req.body;
  if (!raw_text?.trim()) return res.status(400).json({ error: 'raw_text is required' });

  if (isAiConfigured()) {
    try {
      const extracted = await generateJSON(`You are an assistant for a college administrative system. Extract structured information from the following announcement text.

Return ONLY a valid JSON object with these fields:
{
  "title": "Short 1-line title (max 80 chars)",
  "audience": "Who this is for, e.g. 'II BBA Students', 'All Students', 'Staff', 'III BCom Section A'",
  "body": "Cleaned body text (max 500 chars)",
  "action": "What the reader must do (1 sentence)",
  "event_date_text": "Date mentioned if any, or null",
  "priority": "High, Medium, or Low"
}

Announcement text:
"""
${raw_text.slice(0, 2000)}
"""`);
      return res.json({ extracted, source: 'ai' });
    } catch (err) {
      console.error('AI extraction failed:', err.message);
    }
  }
  res.json({ extracted: mockExtractAnnouncement(raw_text), source: 'rules' });
});

// ── Create announcement ───────────────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { raw_text, title, audience, body, action, event_date, scheduled_at, priority, status } = req.body;
  if (!title && !raw_text) return res.status(400).json({ error: 'title or raw_text is required' });

  const safeStatus = ['draft', 'published', 'ready_to_publish', 'scheduled'].includes(status)
    ? (status === 'ready_to_publish' ? 'published' : status) : 'draft';

  try {
    const { rows } = await pool.query(
      `INSERT INTO announcements (university_id, raw_text, title, audience, body, action, event_date, scheduled_at, priority, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.university_id, raw_text || body || title, title,
       audience || 'All Students', body || raw_text || null, action || null,
       event_date || null, scheduled_at || null, priority || 'Medium', safeStatus, req.user.id]
    );
    const ann = rows[0];
    if (safeStatus === 'published') {
      sendAnnouncementNotifications(ann, req.user.university_id).catch(console.error);
    }
    res.status(201).json(ann);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save announcement' });
  }
});

// ── List announcements ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { status } = req.query;
  try {
    const params = [req.user.university_id];
    let query = `SELECT * FROM announcements WHERE university_id = $1`;

    if (req.user.role !== 'admin') {
      query += ` AND status = 'published'`;
      const { where, params: aParams } = audienceToUserFilter(null, params.length + 1);
      query += ` AND (audience IS NULL OR audience = '' OR EXISTS (
        SELECT 1 FROM users WHERE id = $2 AND (${where})
      ))`;
      params.push(req.user.id, ...aParams);
    } else if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY COALESCE(scheduled_at, created_at) DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load announcements' });
  }
});

// ── Record a view (student) ───────────────────────────────────────────────────
router.post('/:id/view', requireAuth, async (req, res) => {
  if (req.user.role === 'admin') return res.json({ ok: true }); // don't track admin views
  try {
    await pool.query(
      `INSERT INTO announcement_views (announcement_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (announcement_id, user_id) DO NOTHING`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// ── Admin stats for one announcement ─────────────────────────────────────────
router.get('/:id/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [ann] } = await pool.query(
      `SELECT id, audience, university_id FROM announcements WHERE id = $1 AND university_id = $2`,
      [req.params.id, req.user.university_id]
    );
    if (!ann) return res.status(404).json({ error: 'Not found' });

    const { where, params: aParams } = audienceToUserFilter(ann.audience, 2);
    const { rows: [totRow] } = await pool.query(
      `SELECT COUNT(*) AS total FROM users WHERE university_id = $1 AND ${where}`,
      [ann.university_id, ...aParams]
    );
    const { rows: [viewRow] } = await pool.query(
      `SELECT COUNT(*) AS viewed FROM announcement_views WHERE announcement_id = $1`,
      [ann.id]
    );

    const total = parseInt(totRow.total, 10);
    const viewed = parseInt(viewRow.viewed, 10);
    res.json({
      total_targeted: total,
      viewed,
      not_viewed: Math.max(0, total - viewed),
      pct_viewed: total > 0 ? Math.round((viewed / total) * 100) : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ── Update announcement ───────────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, audience, body, action, event_date, scheduled_at, priority, status } = req.body;
  try {
    const { rows: [existing] } = await pool.query(
      `SELECT * FROM announcements WHERE id = $1 AND university_id = $2`,
      [req.params.id, req.user.university_id]
    );
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    const newStatus = status || existing.status;
    const { rows } = await pool.query(
      `UPDATE announcements SET
         title = COALESCE($1, title),
         audience = COALESCE($2, audience),
         body = COALESCE($3, body),
         action = COALESCE($4, action),
         event_date = COALESCE($5, event_date),
         scheduled_at = COALESCE($6, scheduled_at),
         priority = COALESCE($7, priority),
         status = $8
       WHERE id = $9 AND university_id = $10 RETURNING *`,
      [title, audience, body, action, event_date, scheduled_at, priority, newStatus,
       req.params.id, req.user.university_id]
    );
    const ann = rows[0];

    if (newStatus === 'published' && existing.status !== 'published' && !existing.notification_sent_at) {
      sendAnnouncementNotifications(ann, req.user.university_id).catch(console.error);
    }
    res.json(ann);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// ── Send notifications manually ───────────────────────────────────────────────
router.post('/:id/notify', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [ann] } = await pool.query(
      `SELECT * FROM announcements WHERE id = $1 AND university_id = $2`,
      [req.params.id, req.user.university_id]
    );
    if (!ann) return res.status(404).json({ error: 'Not found' });
    const count = await sendAnnouncementNotifications(ann, req.user.university_id);
    res.json({ sent: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// ── Delete announcement ───────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM announcements WHERE id = $1 AND university_id = $2`,
      [req.params.id, req.user.university_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Announcement not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// ── Notification helper (idempotent) ─────────────────────────────────────────
async function sendAnnouncementNotifications(announcement, universityId) {
  try {
    const { rows: [fresh] } = await pool.query(
      `SELECT notification_sent_at FROM announcements WHERE id = $1`,
      [announcement.id]
    );
    if (fresh?.notification_sent_at) return 0;
  } catch { /* safe */ }

  const { where, params: aParams } = audienceToUserFilter(announcement.audience, 2);
  const { rows: users } = await pool.query(
    `SELECT id FROM users WHERE university_id = $1 AND ${where}`,
    [universityId, ...aParams]
  );
  if (!users.length) return 0;

  const userIds = users.map(u => u.id);
  await createNotificationBulk(userIds, {
    title: `📢 ${announcement.title || 'New Announcement'}`,
    body: announcement.body || announcement.raw_text || '',
    severity: announcement.priority === 'High' ? 'urgent' : 'info',
    action_url: '/announcements',
    related_type: 'announcement',
    related_id: announcement.id,
  });

  await pool.query(
    `UPDATE announcements SET notification_sent_at = now() WHERE id = $1`,
    [announcement.id]
  );
  return userIds.length;
}

module.exports = router;
