const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generateJSON, isAiConfigured } = require('../lib/ai');

const router = express.Router();

// ── Audience matching ─────────────────────────────────────────────────────────
// Returns a WHERE clause fragment + params to filter users eligible for an audience string.
// Audience strings (case-insensitive) understood:
//   "all" / "all students" / "everyone"           → all students
//   "all staff" / "staff"                          → admins
//   "bba" / "bcom" / <program>                     → that program (students)
//   "sem 3" / "semester 3"                         → that semester
//   "section c" / "sec c"                          → that section
//   "II BBA" / "II BBA students"                   → BBA Sem 3 (roman numerals: I=1,II=3,III=5,IV=7)
//   "council members"                              → admins
//   Combined: "II BBA Section C students"          → matching program+sem+section
// Falls back to "all students" if nothing else matches.

const ROMAN_SEM = { i: 'Sem 1', ii: 'Sem 3', iii: 'Sem 5', iv: 'Sem 7' };

function audienceToUserFilter(audience, startParam = 1) {
  if (!audience) return { where: `role = 'student'`, params: [] };

  const low = audience.toLowerCase().trim();
  const params = [];
  const idx = (n) => `$${startParam + n - 1}`;

  // Staff/admin only
  if (/\b(staff|admin|council|faculty)\b/.test(low)) {
    return { where: `role = 'admin'`, params: [] };
  }

  // All students
  if (/\b(all|everyone)\b/.test(low) || low === 'all students') {
    return { where: `role = 'student'`, params: [] };
  }

  const clauses = [`role = 'student'`];

  // Roman numeral year prefix → semester
  const romanMatch = low.match(/\b(iv|iii|ii|i)\b/);
  if (romanMatch) {
    const sem = ROMAN_SEM[romanMatch[1]];
    if (sem) { params.push(sem); clauses.push(`semester = ${idx(params.length)}`); }
  }

  // Program
  const programMatch = low.match(/\b(bba|bcom|b\.com|mba|mcom|bca|bsc|ba)\b/);
  if (programMatch) {
    const prog = programMatch[1].replace('b.com', 'bcom').toUpperCase().replace('BCOM', 'BCom').replace('BBA', 'BBA');
    params.push(prog);
    clauses.push(`program ILIKE ${idx(params.length)}`);
  }

  // Section
  const sectionMatch = low.match(/section\s+([a-e])/i) || low.match(/\bsec\s+([a-e])\b/i);
  if (sectionMatch) {
    params.push(`Section ${sectionMatch[1].toUpperCase()}`);
    clauses.push(`section = ${idx(params.length)}`);
  }

  // Explicit semester number
  if (!romanMatch) {
    const semMatch = low.match(/\bsem(?:ester)?\s*(\d)\b/);
    if (semMatch) {
      params.push(`Sem ${semMatch[1]}`);
      clauses.push(`semester = ${idx(params.length)}`);
    }
  }

  return { where: clauses.join(' AND '), params };
}

// ── Admin: extract/process raw announcement text ──────────────────────────────
function mockExtractAnnouncement(rawText) {
  const lower = rawText.toLowerCase();
  const priority = /\b(urgent|immediately|deadline)\b/.test(lower) ? 'High'
    : /\b(reminder|important)\b/.test(lower) ? 'Medium' : 'Low';

  const audienceMatch = rawText.match(/Students of ([A-Za-z0-9 ]+?)(?:\s+are|\s+must|,|\.)/i);
  const audience = audienceMatch ? `${audienceMatch[1].trim()} Students` : 'All Students';

  const dateMatch = rawText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?)/);
  const eventDateText = dateMatch ? dateMatch[1] : null;

  const firstSentence = rawText.split(/\.\s/)[0];
  const title = firstSentence.length > 80 ? firstSentence.slice(0, 77) + '...' : firstSentence;

  const actionMatch = rawText.match(/must ([^.]+)\./i);
  const action = actionMatch ? actionMatch[1].trim() : 'Review the announcement details';

  return { title, audience, action, event_date_text: eventDateText, priority };
}

router.post('/process', requireAuth, requireAdmin, async (req, res) => {
  const { raw_text } = req.body;
  if (!raw_text || !raw_text.trim()) return res.status(400).json({ error: 'raw_text is required' });

  if (isAiConfigured()) {
    try {
      const prompt = `You are an assistant for a college administrative system. Extract structured information from the following announcement text.

Return ONLY a valid JSON object with these fields:
{
  "title": "Short 1-line title (max 80 chars)",
  "audience": "Who this is for, e.g. 'II BBA Students', 'All Students', 'Staff', 'III BCom Section A'",
  "body": "Cleaned body text (max 500 chars)",
  "action": "What the reader must do (1 sentence, e.g. 'Check the seating plan before the exam')",
  "event_date_text": "Date mentioned, if any (e.g. '14th August 2024'), or null",
  "priority": "High, Medium, or Low"
}

Announcement text:
"""
${raw_text.slice(0, 2000)}
"""`;

      const extracted = await generateJSON(prompt);
      return res.json({ extracted, source: 'ai' });
    } catch (err) {
      console.error('AI extraction failed, using rules fallback:', err.message);
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
      [req.user.university_id, raw_text || body || title, title, audience || 'All Students',
       body || raw_text || null, action || null, event_date || null, scheduled_at || null,
       priority || 'Medium', safeStatus, req.user.id]
    );
    const ann = rows[0];

    if (safeStatus === 'published') {
      await sendAnnouncementNotifications(ann, req.user.university_id);
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
      // Students only see published announcements intended for them
      query += ` AND status = 'published'`;
      const { where, params: aParams } = audienceToUserFilter(null, params.length + 1);
      // Audience filter: match if audience is null/blank OR user matches
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

// ── Update announcement ───────────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, audience, body, action, event_date, scheduled_at, priority, status } = req.body;
  try {
    // University check first
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

    // Send notifications if transitioning to published and not already sent
    if (newStatus === 'published' && existing.status !== 'published' && !existing.notification_sent_at) {
      await sendAnnouncementNotifications(ann, req.user.university_id);
    }

    res.json(ann);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update announcement' });
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

// ── Notification helper ───────────────────────────────────────────────────────
// Idempotent: checks notification_sent_at before inserting
async function sendAnnouncementNotifications(announcement, universityId) {
  // Check idempotency column (may not exist on old DBs — safe fallback)
  try {
    const { rows: [fresh] } = await pool.query(
      `SELECT notification_sent_at FROM announcements WHERE id = $1`,
      [announcement.id]
    );
    if (fresh?.notification_sent_at) return 0; // already sent
  } catch { /* column may not exist yet, skip check */ }

  const { where, params: aParams } = audienceToUserFilter(announcement.audience, 2);
  const { rows: users } = await pool.query(
    `SELECT id FROM users WHERE university_id = $1 AND ${where}`,
    [universityId, ...aParams]
  );

  if (!users.length) return 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const u of users) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, severity)
         VALUES ($1,$2,$3,'info')
         ON CONFLICT DO NOTHING`,
        [u.id,
         `📢 ${announcement.title || 'New Announcement'}`,
         announcement.body || announcement.raw_text || '']
      );
    }
    // Mark as sent (if column exists)
    try {
      await client.query(
        `UPDATE announcements SET notification_sent_at = now() WHERE id = $1`,
        [announcement.id]
      );
    } catch { /* column not yet present — ignore */ }
    await client.query('COMMIT');
    return users.length;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Notification send error:', err.message);
    return 0;
  } finally {
    client.release();
  }
}

module.exports = router;
