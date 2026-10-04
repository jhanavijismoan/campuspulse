const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/events?from=2024-08-12&to=2024-08-16
router.get('/', requireAuth, async (req, res) => {
  const { from, to } = req.query;
  try {
    let query = `SELECT * FROM events WHERE user_id = $1`;
    const params = [req.user.id];

    if (from) {
      params.push(from);
      query += ` AND starts_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND starts_at <= $${params.length}::date + interval '1 day'`;
    }
    query += ` ORDER BY starts_at ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { title, event_type, description, location, starts_at, status, action_label, action_url } = req.body;
  if (!title || !event_type || !starts_at) {
    return res.status(400).json({ error: 'title, event_type and starts_at are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO events (user_id, title, event_type, description, location, starts_at, status, action_label, action_url)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'upcoming'),$8,$9) RETURNING *`,
      [req.user.id, title, event_type, description || null, location || null, starts_at, status || null, action_label || null, action_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { title, event_type, description, location, starts_at, status, action_label, action_url } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE events SET
         title = COALESCE($1, title),
         event_type = COALESCE($2, event_type),
         description = COALESCE($3, description),
         location = COALESCE($4, location),
         starts_at = COALESCE($5, starts_at),
         status = COALESCE($6, status),
         action_label = COALESCE($7, action_label),
         action_url = COALESCE($8, action_url)
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [title, event_type, description, location, starts_at, status, action_label, action_url, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM events WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Event not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
