'use strict';
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/student/attendance — student's own attendance summary across all enrolled classes
router.get('/attendance', requireAuth, async (req, res) => {
  const { id: userId } = req.user;
  try {
    const { rows: csRows } = await pool.query(
      `SELECT cs.id AS class_student_id, cs.class_id, cs.roll_no,
              c.subject_name, c.program, c.section, c.semester,
              COALESCE(c.attendance_type, 'Theory') AS attendance_type
       FROM class_students cs
       JOIN classes c ON c.id = cs.class_id
       WHERE cs.student_id = $1
       ORDER BY c.id ASC`,
      [userId]
    );

    const results = [];
    for (const cs of csRows) {
      const { rows: records } = await pool.query(
        `SELECT status FROM attendance_records
         WHERE class_id = $1 AND class_student_id = $2
         ORDER BY attendance_date ASC`,
        [cs.class_id, cs.class_student_id]
      );

      const conducted = records.length;
      const present = records.filter((r) => r.status === 'present' || r.status === 'late').length;
      const cl = records.filter((r) => r.status === 'cl').length;
      const absent = records.filter((r) => r.status === 'absent').length;

      const pct_without_cl = conducted > 0 ? Math.round((present / conducted) * 10000) / 100 : null;
      const pct_with_cl = conducted > 0 ? Math.round(((present + cl) / conducted) * 10000) / 100 : null;

      results.push({
        class_id: cs.class_id,
        subject_name: cs.subject_name,
        attendance_type: cs.attendance_type,
        program: cs.program,
        section: cs.section,
        semester: cs.semester,
        roll_no: cs.roll_no,
        conducted,
        present,
        cl,
        absent,
        // legacy alias
        total_classes: conducted,
        attendance_pct: pct_without_cl,
        pct_without_cl,
        pct_with_cl,
      });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load attendance' });
  }
});

// GET /api/student/timetable
router.get('/timetable', requireAuth, async (req, res) => {
  const { id: userId } = req.user;
  try {
    const { rows: events } = await pool.query(
      `SELECT e.title, e.event_type, e.description, e.location, e.starts_at, e.ends_at, e.status
       FROM events e
       WHERE e.user_id = $1 AND e.event_type = 'class'
       ORDER BY e.starts_at ASC`,
      [userId]
    );

    const { rows: classes } = await pool.query(
      `SELECT c.subject_name, c.program, c.section, cs.roll_no
       FROM class_students cs
       JOIN classes c ON c.id = cs.class_id
       WHERE cs.student_id = $1`,
      [userId]
    );

    res.json({ events, classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load timetable' });
  }
});

module.exports = router;
