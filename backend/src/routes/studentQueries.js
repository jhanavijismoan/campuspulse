const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { chat, isAiConfigured } = require('../lib/ai');

const router = express.Router();

// GET /api/student-queries/mine — student's own submitted queries
router.get('/mine', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
  try {
    const { rows } = await pool.query(
      `SELECT sq.*, u.full_name AS admin_name, c.subject_name
       FROM student_queries sq
       LEFT JOIN users u ON u.id = sq.admin_id
       LEFT JOIN classes c ON c.id = sq.class_id
       WHERE sq.student_id = $1
       ORDER BY sq.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load queries' });
  }
});

// POST /api/student-queries — student submits a query
router.post('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
  const { subject, message } = req.body;
  if (!subject?.trim() || !message?.trim()) return res.status(400).json({ error: 'subject and message are required' });
  if (subject.length > 200) return res.status(400).json({ error: 'subject too long' });
  if (message.length > 2000) return res.status(400).json({ error: 'message too long' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO student_queries (student_id, subject, message)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, subject.trim(), message.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit query' });
  }
});

// POST /api/student-queries/:id/draft-reply — AI drafts a reply for the admin
router.post('/:id/draft-reply', requireAuth, requireAdmin, async (req, res) => {
  const { rows: [query] } = await pool.query(
    `SELECT sq.*, u.full_name AS student_name, c.subject_name
     FROM student_queries sq
     LEFT JOIN users u ON u.id = sq.student_id
     LEFT JOIN classes c ON c.id = sq.class_id
     WHERE sq.id = $1`,
    [req.params.id]
  );
  if (!query) return res.status(404).json({ error: 'Query not found' });

  if (!isAiConfigured()) {
    // Rule-based fallback
    const draft = `Hi ${query.student_name || 'Student'},\n\nThank you for your question regarding "${query.subject}".\n\n${query.message}\n\nPlease refer to the relevant course material or contact the academic office for further assistance.\n\nBest regards,\n${req.user.full_name}`;
    return res.json({ draft, source: 'fallback' });
  }

  try {
    const { text } = await chat({
      system: `You are a helpful college teacher drafting a reply to a student query. Be warm, professional, and concise. Do not fabricate specific dates, grades, or facts you do not know. Sign off as "${req.user.full_name}".`,
      messages: [{
        role: 'user',
        content: `Student query from ${query.student_name || 'a student'} about "${query.subject_name || query.subject}":\n\n"${query.message}"\n\nPlease draft a helpful, professional reply in 2-3 sentences.`,
      }],
      maxTokens: 300,
      temperature: 0.6,
    });
    res.json({ draft: text.trim(), source: 'ai' });
  } catch (err) {
    console.error('AI draft failed:', err.message);
    res.status(500).json({ error: 'AI draft failed: ' + err.message });
  }
});

// GET /api/student-queries — admin: all queries
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sq.*, u.full_name AS student_name, c.subject_name
       FROM student_queries sq
       LEFT JOIN users u ON u.id = sq.student_id
       LEFT JOIN classes c ON c.id = sq.class_id
       WHERE sq.admin_id = $1 OR sq.admin_id IS NULL
       ORDER BY answered ASC, created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load student queries' });
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { answered, reply } = req.body;
  try {
    let queryText = `UPDATE student_queries
       SET answered = COALESCE($1, answered),
           answered_at = CASE WHEN COALESCE($1, answered) THEN now() ELSE NULL END`;
    const params = [answered, req.params.id, req.user.id];
    if (reply !== undefined) {
      params.splice(1, 0, reply); // insert reply as $2, shift others
      queryText = `UPDATE student_queries
       SET answered = COALESCE($1, answered),
           answered_at = CASE WHEN COALESCE($1, answered) THEN now() ELSE NULL END,
           reply = $2`;
      queryText += ` WHERE id = $3 AND (admin_id = $4 OR admin_id IS NULL) RETURNING *`;
      const { rows } = await pool.query(queryText, [answered, reply, req.params.id, req.user.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Student query not found' });
      return res.json(rows[0]);
    }
    queryText += ` WHERE id = $2 AND (admin_id = $3 OR admin_id IS NULL) RETURNING *`;
    const { rows } = await pool.query(queryText, params);
    if (!rows[0]) return res.status(404).json({ error: 'Student query not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update student query' });
  }
});

module.exports = router;
