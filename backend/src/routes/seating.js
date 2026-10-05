const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// Build a hall grid: rows x seats_per_row, each cell has assignment info if filled
async function buildHallGrid(sessionId, hallId) {
  const { rows: [hall] } = await pool.query(
    `SELECT name, rows, seats_per_row, capacity FROM exam_halls WHERE id = $1`,
    [hallId]
  );
  if (!hall) return null;

  const { rows: assignments } = await pool.query(
    `SELECT sa.row_number, sa.seat_number, sa.roll_no, u.full_name, u.id AS student_id
     FROM seat_assignments sa
     JOIN users u ON u.id = sa.student_id
     WHERE sa.session_id = $1 AND sa.hall_id = $2
     ORDER BY sa.row_number, sa.seat_number`,
    [sessionId, hallId]
  );

  const assignMap = {};
  for (const a of assignments) {
    assignMap[`${a.row_number}-${a.seat_number}`] = a;
  }

  const grid = [];
  for (let r = 1; r <= hall.rows; r++) {
    const row = [];
    for (let s = 1; s <= hall.seats_per_row; s++) {
      const key = `${r}-${s}`;
      row.push(assignMap[key] ? { row: r, seat: s, occupied: true, ...assignMap[key] } : { row: r, seat: s, occupied: false });
    }
    grid.push(row);
  }
  return { hall, grid, assigned: assignments.length };
}

// ── Student routes ────────────────────────────────────────────────────────────

// GET /api/seating/me — student's own seating for all published sessions
router.get('/me', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Student access only' });
  try {
    const { rows } = await pool.query(
      `SELECT
         sa.id, sa.row_number, sa.seat_number, sa.roll_no,
         es.id AS session_id, es.title AS session_title,
         es.exam_date, es.start_time, es.end_time,
         eh.id AS hall_id, eh.name AS hall_name,
         eh.rows AS hall_rows, eh.seats_per_row
       FROM seat_assignments sa
       JOIN exam_sessions es ON es.id = sa.session_id
       JOIN exam_halls eh ON eh.id = sa.hall_id
       WHERE sa.student_id = $1 AND es.published = true
       ORDER BY es.exam_date ASC, es.start_time ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch seating' });
  }
});

// GET /api/seating/sessions/:id/hall-chart — hall grid for a published session (student view)
router.get('/sessions/:id/hall-chart', requireAuth, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  try {
    const { rows: [session] } = await pool.query(
      `SELECT id, title, exam_date, start_time, end_time, published FROM exam_sessions
       WHERE id = $1 AND university_id = $2`,
      [sessionId, req.user.university_id]
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.published && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seating not published yet' });
    }

    const { rows: halls } = await pool.query(
      `SELECT DISTINCT eh.id, eh.name, eh.rows, eh.seats_per_row
       FROM seat_assignments sa JOIN exam_halls eh ON eh.id = sa.hall_id
       WHERE sa.session_id = $1`,
      [sessionId]
    );

    const charts = [];
    for (const hall of halls) {
      const data = await buildHallGrid(sessionId, hall.id);
      charts.push(data);
    }
    res.json({ session, charts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hall chart' });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /api/seating/sessions — list all sessions for this university
router.get('/sessions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT es.*, u.full_name AS created_by_name,
         COUNT(DISTINCT sa.id)::int AS total_seats,
         COUNT(DISTINCT id_duties.id)::int AS total_duties
       FROM exam_sessions es
       LEFT JOIN users u ON u.id = es.created_by
       LEFT JOIN seat_assignments sa ON sa.session_id = es.id
       LEFT JOIN invigilation_duties id_duties ON id_duties.session_id = es.id
       WHERE es.university_id = $1
       GROUP BY es.id, u.full_name
       ORDER BY es.exam_date DESC, es.start_time DESC`,
      [req.user.university_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/seating/sessions — create a session
router.post('/sessions', requireAuth, requireAdmin, async (req, res) => {
  const { title, exam_date, start_time, end_time, program, semester } = req.body;
  if (!title || !exam_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'title, exam_date, start_time, end_time are required' });
  }
  try {
    const { rows: [session] } = await pool.query(
      `INSERT INTO exam_sessions (university_id, title, exam_date, start_time, end_time, program, semester, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.university_id, title, exam_date, start_time, end_time, program || null, semester || null, req.user.id]
    );
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/seating/halls — list halls for this university
router.get('/halls', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT eh.*, COUNT(sa.id)::int AS assigned_count
       FROM exam_halls eh
       LEFT JOIN seat_assignments sa ON sa.hall_id = eh.id
       WHERE eh.university_id = $1
       GROUP BY eh.id ORDER BY eh.name`,
      [req.user.university_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch halls' });
  }
});

// POST /api/seating/halls — create a hall
router.post('/halls', requireAuth, requireAdmin, async (req, res) => {
  const { name, capacity, rows, seats_per_row } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows: [hall] } = await pool.query(
      `INSERT INTO exam_halls (university_id, name, capacity, rows, seats_per_row)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.university_id, name, capacity || 30, rows || 5, seats_per_row || 6]
    );
    res.status(201).json(hall);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A hall with that name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create hall' });
  }
});

// GET /api/seating/sessions/:id/allocations — all seat assignments for a session
router.get('/sessions/:id/allocations', requireAuth, requireAdmin, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  try {
    const { rows } = await pool.query(
      `SELECT sa.*, u.full_name, u.email, eh.name AS hall_name
       FROM seat_assignments sa
       JOIN users u ON u.id = sa.student_id
       JOIN exam_halls eh ON eh.id = sa.hall_id
       WHERE sa.session_id = $1
       ORDER BY eh.name, sa.row_number, sa.seat_number`,
      [sessionId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

// POST /api/seating/sessions/:id/allocate — manually assign one student
router.post('/sessions/:id/allocate', requireAuth, requireAdmin, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  const { hall_id, student_id, row_number, seat_number } = req.body;
  if (!hall_id || !student_id || !row_number || !seat_number) {
    return res.status(400).json({ error: 'hall_id, student_id, row_number, seat_number are required' });
  }
  try {
    const { rows: csRows } = await pool.query(
      `SELECT roll_no FROM class_students WHERE student_id = $1 LIMIT 1`,
      [student_id]
    );
    const rollNo = csRows[0]?.roll_no || null;
    const { rows: [assignment] } = await pool.query(
      `INSERT INTO seat_assignments (session_id, hall_id, student_id, row_number, seat_number, roll_no)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (session_id, student_id) DO UPDATE
         SET hall_id=$2, row_number=$4, seat_number=$5, roll_no=$6
       RETURNING *`,
      [sessionId, hall_id, student_id, row_number, seat_number, rollNo]
    );
    res.json(assignment);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That seat is already taken' });
    console.error(err);
    res.status(500).json({ error: 'Failed to allocate seat' });
  }
});

// PATCH /api/seating/assignments/:id/move — move a student to a different seat
router.patch('/assignments/:id/move', requireAuth, requireAdmin, async (req, res) => {
  const assignmentId = parseInt(req.params.id);
  const { hall_id, row_number, seat_number } = req.body;
  if (!hall_id || !row_number || !seat_number) {
    return res.status(400).json({ error: 'hall_id, row_number, seat_number are required' });
  }
  try {
    const { rows: [updated] } = await pool.query(
      `UPDATE seat_assignments SET hall_id=$1, row_number=$2, seat_number=$3
       WHERE id=$4 RETURNING *`,
      [hall_id, row_number, seat_number, assignmentId]
    );
    if (!updated) return res.status(404).json({ error: 'Assignment not found' });
    res.json(updated);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That seat is already taken' });
    console.error(err);
    res.status(500).json({ error: 'Failed to move seat' });
  }
});

// POST /api/seating/sessions/:id/import-csv — bulk import seats from CSV
// CSV format (header row): student_email,hall_name,row_number,seat_number
router.post('/sessions/:id/import-csv', requireAuth, requireAdmin, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  const { rows: csvRows } = req.body; // [{ student_email, hall_name, row_number, seat_number }]
  if (!Array.isArray(csvRows) || csvRows.length === 0) {
    return res.status(400).json({ error: 'rows array is required' });
  }
  if (csvRows.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 rows per import' });
  }

  const errors = [];
  const inserted = [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < csvRows.length; i++) {
      const { student_email, hall_name, row_number, seat_number } = csvRows[i];
      try {
        const { rows: [student] } = await client.query(
          `SELECT id FROM users WHERE email = $1 AND university_id = $2`,
          [student_email, req.user.university_id]
        );
        if (!student) { errors.push({ row: i + 1, error: `Student not found: ${student_email}` }); continue; }

        const { rows: [hall] } = await client.query(
          `SELECT id FROM exam_halls WHERE name = $1 AND university_id = $2`,
          [hall_name, req.user.university_id]
        );
        if (!hall) { errors.push({ row: i + 1, error: `Hall not found: ${hall_name}` }); continue; }

        const { rows: csRows } = await client.query(
          `SELECT roll_no FROM class_students WHERE student_id = $1 LIMIT 1`,
          [student.id]
        );
        const rollNo = csRows[0]?.roll_no || null;

        await client.query(
          `INSERT INTO seat_assignments (session_id, hall_id, student_id, row_number, seat_number, roll_no)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (session_id, student_id) DO UPDATE
             SET hall_id=$2, row_number=$4, seat_number=$5, roll_no=$6`,
          [sessionId, hall.id, student.id, row_number, seat_number, rollNo]
        );
        inserted.push(student_email);
      } catch (rowErr) {
        errors.push({ row: i + 1, error: rowErr.message });
      }
    }
    await client.query('COMMIT');
    res.json({ inserted: inserted.length, errors });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Import failed' });
  } finally {
    client.release();
  }
});

// GET /api/seating/sessions/:id/duties — invigilation duties for a session
router.get('/sessions/:id/duties', requireAuth, requireAdmin, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  try {
    const { rows } = await pool.query(
      `SELECT id_d.*, u.full_name AS admin_name, eh.name AS hall_name
       FROM invigilation_duties id_d
       JOIN users u ON u.id = id_d.admin_id
       JOIN exam_halls eh ON eh.id = id_d.hall_id
       WHERE id_d.session_id = $1
       ORDER BY eh.name, u.full_name`,
      [sessionId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch duties' });
  }
});

// GET /api/seating/my-duties — invigilator's own duties
router.get('/my-duties', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id_d.*, es.title AS session_title, es.exam_date, es.start_time, es.end_time,
              eh.name AS hall_name, es.published
       FROM invigilation_duties id_d
       JOIN exam_sessions es ON es.id = id_d.session_id
       JOIN exam_halls eh ON eh.id = id_d.hall_id
       WHERE id_d.admin_id = $1
       ORDER BY es.exam_date ASC, es.start_time ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch duties' });
  }
});

// POST /api/seating/sessions/:id/duties — assign an invigilator
router.post('/sessions/:id/duties', requireAuth, requireAdmin, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  const { hall_id, admin_id, duty_role } = req.body;
  if (!hall_id || !admin_id) return res.status(400).json({ error: 'hall_id and admin_id are required' });
  try {
    const { rows: [duty] } = await pool.query(
      `INSERT INTO invigilation_duties (session_id, hall_id, admin_id, duty_role)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (session_id, hall_id, admin_id) DO UPDATE SET duty_role = $4
       RETURNING *`,
      [sessionId, hall_id, admin_id, duty_role || 'invigilator']
    );
    res.json(duty);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign duty' });
  }
});

// POST /api/seating/sessions/:id/publish — publish (idempotent) and notify students
router.post('/sessions/:id/publish', requireAuth, requireAdmin, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [session] } = await client.query(
      `SELECT * FROM exam_sessions WHERE id = $1 AND university_id = $2`,
      [sessionId, req.user.university_id]
    );
    if (!session) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Session not found' }); }

    if (session.published) {
      await client.query('ROLLBACK');
      return res.json({ message: 'Already published', session });
    }

    await client.query(
      `UPDATE exam_sessions SET published = true, published_at = now() WHERE id = $1`,
      [sessionId]
    );

    // Notify every student who has a seat in this session
    const { rows: students } = await client.query(
      `SELECT DISTINCT sa.student_id FROM seat_assignments sa WHERE sa.session_id = $1`,
      [sessionId]
    );

    for (const { student_id } of students) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, severity)
         VALUES ($1,$2,$3,'urgent')`,
        [student_id, `Seating Plan Published: ${session.title}`,
          `Your seating plan for "${session.title}" is now available. View it before the exam.`]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Published', notified: students.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to publish' });
  } finally {
    client.release();
  }
});

// POST /api/seating/sessions/:id/unpublish
router.post('/sessions/:id/unpublish', requireAuth, requireAdmin, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  try {
    const { rows: [session] } = await pool.query(
      `UPDATE exam_sessions SET published = false, published_at = null
       WHERE id = $1 AND university_id = $2 RETURNING *`,
      [sessionId, req.user.university_id]
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Unpublished', session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unpublish' });
  }
});

module.exports = router;
