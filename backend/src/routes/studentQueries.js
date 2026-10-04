const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

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
  const { answered } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE student_queries
       SET answered = COALESCE($1, answered),
           answered_at = CASE WHEN COALESCE($1, answered) THEN now() ELSE NULL END
       WHERE id = $2 AND (admin_id = $3 OR admin_id IS NULL)
       RETURNING *`,
      [answered, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student query not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update student query' });
  }
});

module.exports = router;
