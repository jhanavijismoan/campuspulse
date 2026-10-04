const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pt.*, c.subject_name, c.section
       FROM pending_tasks pt
       LEFT JOIN classes c ON c.id = pt.class_id
       WHERE pt.admin_id = $1
       ORDER BY completed ASC, due_date ASC NULLS LAST, created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load pending tasks' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, class_id, due_date, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO pending_tasks (admin_id, class_id, title, due_date, priority)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, class_id || null, title, due_date || null, priority || 'Medium']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, class_id, due_date, priority, completed } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE pending_tasks SET
         title = COALESCE($1, title),
         class_id = COALESCE($2, class_id),
         due_date = COALESCE($3, due_date),
         priority = COALESCE($4, priority),
         completed = COALESCE($5, completed)
       WHERE id = $6 AND admin_id = $7 RETURNING *`,
      [title, class_id, due_date, priority, completed, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM pending_tasks WHERE id = $1 AND admin_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
