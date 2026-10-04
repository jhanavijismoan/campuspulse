const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM classes WHERE teacher_id = $1 ORDER BY subject_name ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load classes' });
  }
});

router.get('/:id/roster', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [klass] } = await pool.query(
      `SELECT * FROM classes WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!klass) return res.status(404).json({ error: 'Class not found' });

    const { rows: students } = await pool.query(
      `SELECT * FROM class_students WHERE class_id = $1 ORDER BY roll_no ASC`,
      [req.params.id]
    );
    res.json({ class: klass, students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load roster' });
  }
});

router.get('/:id/attendance', requireAuth, requireAdmin, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await pool.query(
      `SELECT ar.*, cs.roll_no, cs.full_name
       FROM attendance_records ar
       JOIN class_students cs ON cs.id = ar.class_student_id
       JOIN classes c ON c.id = ar.class_id
       WHERE ar.class_id = $1 AND ar.attendance_date = $2 AND c.teacher_id = $3
       ORDER BY cs.roll_no ASC`,
      [req.params.id, date, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load attendance' });
  }
});

router.post('/:id/attendance', requireAuth, requireAdmin, async (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records)) return res.status(400).json({ error: 'date and records are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [klass] } = await client.query(
      `SELECT id FROM classes WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!klass) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Class not found' });
    }

    for (const record of records) {
      await client.query(
        `INSERT INTO attendance_records (class_id, class_student_id, attendance_date, status, marked_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (class_id, class_student_id, attendance_date)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, updated_at = now()`,
        [req.params.id, record.class_student_id, date, record.status, req.user.id]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save attendance' });
  } finally {
    client.release();
  }
});

module.exports = router;
