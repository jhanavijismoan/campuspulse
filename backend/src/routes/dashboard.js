const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Highlight cards at the top of the dashboard: urgent / due-soon / today's items.
router.get('/highlights', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, event_type, description, location, starts_at, status, action_label, action_url
       FROM events
       WHERE user_id = $1
         AND (
           status IN ('urgent', 'due_soon')
           OR starts_at::date = CURRENT_DATE
         )
       ORDER BY
         CASE status WHEN 'urgent' THEN 0 WHEN 'due_soon' THEN 1 ELSE 2 END,
         starts_at ASC
       LIMIT 6`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load highlights' });
  }
});

module.exports = router;
