'use strict';
const { Router } = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/notifications — list all for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, body, severity, read, read_at, action_url, related_type, related_id, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/count — unread count
router.get('/count', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read = false`,
      [req.user.id]
    );
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get count' });
  }
});

// POST /api/notifications/:id/read — mark one read
router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE notifications
       SET read = true, read_at = COALESCE(read_at, now())
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// POST /api/notifications/read-all — mark all read
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET read = true, read_at = COALESCE(read_at, now())
       WHERE user_id = $1 AND read = false`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

module.exports = router;
