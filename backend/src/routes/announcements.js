const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Mocked "AI" extraction. This stands in for a real LLM call (e.g. Claude API)
 * that would pull structured fields out of free-text announcement copy.
 * Swap the body of this function for a real API call when ready -
 * the route contract (input/output shape) stays the same.
 */
function mockExtractAnnouncement(rawText) {
  const priorityKeywords = { urgent: 'High', immediately: 'High', deadline: 'High', reminder: 'Medium' };
  let priority = 'Medium';
  const lower = rawText.toLowerCase();
  for (const [kw, level] of Object.entries(priorityKeywords)) {
    if (lower.includes(kw)) priority = level;
  }

  // naive "who" extraction: look for patterns like "Students of X"
  const audienceMatch = rawText.match(/Students of ([A-Za-z0-9 ]+?)(?:\s+are|\s+must|,|\.)/i);
  const audience = audienceMatch ? `${audienceMatch[1].trim()} Students` : 'All Students';

  // naive date extraction: "13th August", "14 Aug 2024" etc.
  const dateMatch = rawText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?)/);
  const eventDateText = dateMatch ? dateMatch[1] : null;

  // naive title: first sentence, trimmed
  const firstSentence = rawText.split(/\.\s/)[0];
  const title = firstSentence.length > 80 ? firstSentence.slice(0, 77) + '...' : firstSentence;

  // naive action: look for "must ..." clause
  const actionMatch = rawText.match(/must ([^.]+)\./i);
  const action = actionMatch ? actionMatch[1].trim() : 'Review the announcement details';

  return {
    title,
    audience,
    action,
    event_date_text: eventDateText,
    priority,
  };
}

// Admin: paste raw announcement text and get an AI-drafted structured record back.
router.post('/process', requireAuth, requireAdmin, async (req, res) => {
  const { raw_text } = req.body;
  if (!raw_text || !raw_text.trim()) {
    return res.status(400).json({ error: 'raw_text is required' });
  }
  const extracted = mockExtractAnnouncement(raw_text);
  res.json({ extracted, source: 'mock' });
});

// Admin: save an extracted/edited announcement as ready to publish, or publish it.
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { raw_text, title, audience, body, action, event_date, scheduled_at, priority, status } = req.body;
  const safeStatus = status === 'ready_to_publish' ? 'published' : (status || 'draft');
  try {
    const { rows } = await pool.query(
      `INSERT INTO announcements (raw_text, title, audience, body, action, event_date, scheduled_at, priority, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [raw_text || body || title, title, audience, body || raw_text || null, action || null, event_date || null, scheduled_at || null, priority || 'Medium', safeStatus, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save announcement' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  const { status } = req.query;
  try {
    const params = [];
    let query = `SELECT * FROM announcements WHERE 1=1`;
    if (req.user.role !== 'admin') {
      query += ` AND status IN ('published', 'ready_to_publish')`;
    }
    if (status && status !== 'all') {
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

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, audience, body, action, event_date, scheduled_at, priority, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE announcements SET
         title = COALESCE($1, title),
         audience = COALESCE($2, audience),
         body = COALESCE($3, body),
         action = COALESCE($4, action),
         event_date = COALESCE($5, event_date),
         scheduled_at = COALESCE($6, scheduled_at),
         priority = COALESCE($7, priority),
         status = COALESCE($8, status)
       WHERE id = $9 RETURNING *`,
      [title, audience, body, action, event_date, scheduled_at, priority, status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Announcement not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM announcements WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Announcement not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;
