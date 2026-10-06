const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/cia — student: own published marks grouped by class
router.get('/', requireAuth, async (req, res) => {
  const { id: userId, role } = req.user;

  if (role === 'admin') {
    // Admin: return all marks for their university classes
    const { class_id } = req.query;
    const params = [req.user.university_id];
    let extra = '';
    if (class_id) { extra = ' AND c.id = $2'; params.push(class_id); }
    try {
      const { rows } = await pool.query(
        `SELECT cm.id, cm.class_id, c.subject_name, cm.student_id,
                u.name AS student_name, cm.cia_number,
                cm.marks_obtained, cm.max_marks, cm.published, cm.updated_at
         FROM cia_marks cm
         JOIN classes c ON c.id = cm.class_id
         JOIN users u ON u.id = cm.student_id
         WHERE c.university_id = $1${extra}
         ORDER BY c.subject_name, cm.cia_number, u.name`,
        params
      );
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to load marks' });
    }
  }

  // Student: published marks only
  try {
    const { rows } = await pool.query(
      `SELECT cm.class_id, c.subject_name, cm.cia_number,
              cm.marks_obtained, cm.max_marks, cm.updated_at
       FROM cia_marks cm
       JOIN classes c ON c.id = cm.class_id
       WHERE cm.student_id = $1 AND cm.published = true
       ORDER BY c.subject_name, cm.cia_number`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load marks' });
  }
});

// POST /api/cia — admin: upsert a mark
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { class_id, student_id, cia_number, marks_obtained, max_marks = 25, published = false } = req.body;
  if (!class_id || !student_id || !cia_number || marks_obtained == null) {
    return res.status(400).json({ error: 'class_id, student_id, cia_number, marks_obtained are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO cia_marks (class_id, student_id, cia_number, marks_obtained, max_marks, published, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (class_id, student_id, cia_number)
       DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained,
                     max_marks = EXCLUDED.max_marks,
                     published = EXCLUDED.published,
                     updated_at = NOW()
       RETURNING *`,
      [class_id, student_id, cia_number, marks_obtained, max_marks, published]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save mark' });
  }
});

// PATCH /api/cia/:id — admin: update or publish a mark
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { marks_obtained, max_marks, published } = req.body;
  const updates = [];
  const params = [];
  if (marks_obtained != null) { params.push(marks_obtained); updates.push(`marks_obtained = $${params.length}`); }
  if (max_marks != null)      { params.push(max_marks);      updates.push(`max_marks = $${params.length}`); }
  if (published != null)      { params.push(published);      updates.push(`published = $${params.length}`); }
  if (updates.length === 0)   return res.status(400).json({ error: 'Nothing to update' });
  updates.push(`updated_at = NOW()`);
  params.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE cia_marks SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Mark not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update mark' });
  }
});

module.exports = router;
