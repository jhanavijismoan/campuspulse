'use strict';
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { createNotification } = require('../lib/notifications');

const router = express.Router();

// GET /api/classes — list all classes for the logged-in teacher
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, subject_name, program, section, semester,
              COALESCE(attendance_type,'Theory') AS attendance_type, student_count, created_at
       FROM classes WHERE teacher_id = $1 ORDER BY program, semester, subject_name ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load classes' });
  }
});

// POST /api/classes — create a new class
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { subject_name, program, section, semester, attendance_type = 'Theory' } = req.body;
  if (!subject_name || !program || !section) return res.status(400).json({ error: 'subject_name, program, section required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO classes (teacher_id, subject_name, program, section, semester, attendance_type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, subject_name, program, section, semester || null, attendance_type]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// GET /api/classes/:id/roster
router.get('/:id/roster', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [klass] } = await pool.query(
      `SELECT id, subject_name, program, section, semester,
              COALESCE(attendance_type,'Theory') AS attendance_type, student_count
       FROM classes WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!klass) return res.status(404).json({ error: 'Class not found' });

    const { rows: students } = await pool.query(
      `SELECT cs.id, cs.roll_no, cs.full_name, cs.student_id,
              (SELECT COUNT(*) FROM attendance_records ar WHERE ar.class_student_id = cs.id) AS sessions_recorded,
              (SELECT COUNT(*) FROM attendance_records ar WHERE ar.class_student_id = cs.id AND ar.status IN ('present','late','cl')) AS sessions_present
       FROM class_students cs WHERE cs.class_id = $1 ORDER BY cs.roll_no ASC`,
      [req.params.id]
    );
    res.json({ class: klass, students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load roster' });
  }
});

// GET /api/classes/:id/sessions — list distinct dated sessions for a class
router.get('/:id/sessions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [klass] } = await pool.query(
      `SELECT id FROM classes WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!klass) return res.status(404).json({ error: 'Class not found' });

    const { rows } = await pool.query(
      `SELECT attendance_date,
              COUNT(*) AS total,
              SUM(CASE WHEN status IN ('present','late','cl') THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
              MAX(updated_at) AS last_updated
       FROM attendance_records
       WHERE class_id = $1
       GROUP BY attendance_date
       ORDER BY attendance_date DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// GET /api/classes/:id/attendance?date=YYYY-MM-DD
router.get('/:id/attendance', requireAuth, requireAdmin, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const { rows: [klass] } = await pool.query(
      `SELECT id FROM classes WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!klass) return res.status(404).json({ error: 'Class not found' });

    // Return all students for this class with their status for this date (null if not recorded)
    const { rows } = await pool.query(
      `SELECT cs.id AS class_student_id, cs.roll_no, cs.full_name, cs.student_id,
              ar.status, ar.updated_at
       FROM class_students cs
       LEFT JOIN attendance_records ar ON ar.class_student_id = cs.id AND ar.attendance_date = $2 AND ar.class_id = $1
       WHERE cs.class_id = $1
       ORDER BY cs.roll_no ASC`,
      [req.params.id, date]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load attendance' });
  }
});

// POST /api/classes/:id/attendance — save/update a full session
router.post('/:id/attendance', requireAuth, requireAdmin, async (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records) || records.length === 0)
    return res.status(400).json({ error: 'date and records are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [klass] } = await client.query(
      `SELECT id, subject_name FROM classes WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!klass) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Class not found' }); }

    const notifiedStudents = new Set();
    for (const rec of records) {
      const { rows: [existing] } = await client.query(
        `SELECT status FROM attendance_records WHERE class_id=$1 AND class_student_id=$2 AND attendance_date=$3`,
        [req.params.id, rec.class_student_id, date]
      );

      await client.query(
        `INSERT INTO attendance_records (class_id, class_student_id, attendance_date, status, marked_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (class_id, class_student_id, attendance_date)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, updated_at = now()`,
        [req.params.id, rec.class_student_id, date, rec.status, req.user.id]
      );

      // Notify student if status changed and they have a user account
      if ((!existing || existing.status !== rec.status)) {
        const { rows: [cs] } = await client.query(
          `SELECT student_id FROM class_students WHERE id = $1`,
          [rec.class_student_id]
        );
        if (cs && cs.student_id && !notifiedStudents.has(cs.student_id)) {
          notifiedStudents.add(cs.student_id);
          createNotification(cs.student_id, {
            title: 'Attendance Updated',
            body: `Your attendance was updated for ${klass.subject_name} on ${date}.`,
            severity: 'info',
            action_url: '/attendance',
            related_type: 'attendance',
            related_id: req.params.id,
          }).catch(console.error);
        }
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, records_saved: records.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save attendance' });
  } finally {
    client.release();
  }
});

// GET /api/classes/:id/stats — per-student attendance stats for a class
router.get('/:id/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [klass] } = await pool.query(
      `SELECT id, subject_name FROM classes WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!klass) return res.status(404).json({ error: 'Class not found' });

    const { rows } = await pool.query(
      `SELECT cs.roll_no, cs.full_name,
              COUNT(ar.id) AS conducted,
              SUM(CASE WHEN ar.status IN ('present','late','cl') THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) AS absent,
              CASE WHEN COUNT(ar.id) > 0
                   THEN ROUND(100.0 * SUM(CASE WHEN ar.status IN ('present','late','cl') THEN 1 ELSE 0 END) / COUNT(ar.id), 2)
                   ELSE NULL END AS attendance_pct
       FROM class_students cs
       LEFT JOIN attendance_records ar ON ar.class_student_id = cs.id AND ar.class_id = $1
       WHERE cs.class_id = $1
       GROUP BY cs.id, cs.roll_no, cs.full_name
       ORDER BY cs.roll_no ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

module.exports = router;
