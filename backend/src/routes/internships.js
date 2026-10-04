const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { syncMatchScoresForUser } = require('../lib/matchSync');

const router = express.Router();

const SORT_MAP = {
  match: 'ia.match_score DESC NULLS LAST, i.created_at DESC',
  newest: 'i.created_at DESC',
  oldest: 'i.created_at ASC',
  stipend_desc: 'i.stipend_amount DESC NULLS LAST, i.created_at DESC',
  stipend_asc: 'i.stipend_amount ASC NULLS LAST, i.created_at DESC',
  deadline_asc: 'i.application_deadline ASC NULLS LAST',
  deadline_desc: 'i.application_deadline DESC NULLS LAST',
};

// Internships personalized for the logged-in student, sorted/filtered per query params.
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const { rows } = await pool.query(
        `SELECT i.*, NULL::integer AS match_score, NULL::text AS match_reason, 'admin_view' AS application_status
         FROM internships i ORDER BY i.created_at DESC`
      );
      return res.json(rows);
    }

    await syncMatchScoresForUser(req.user.id);

    const { sort = 'match', work_mode, show_closed } = req.query;
    const params = [req.user.id];
    let query = `
      SELECT i.*, ia.match_score, ia.match_reason, ia.status AS application_status
      FROM internships i
      JOIN internship_applications ia ON ia.internship_id = i.id
      WHERE ia.user_id = $1`;

    if (work_mode) {
      params.push(work_mode);
      query += ` AND i.work_mode = $${params.length}`;
    }
    if (show_closed !== 'true') {
      query += ` AND (i.application_deadline IS NULL OR i.application_deadline >= CURRENT_DATE)`;
    }
    query += ` ORDER BY ${SORT_MAP[sort] || SORT_MAP.match}`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load internships' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const {
    company_name, role_title, location, work_mode, stipend_text, stipend_amount,
    tags, description, requirements, duration, application_deadline,
  } = req.body;
  if (!company_name || !role_title) return res.status(400).json({ error: 'company_name and role_title are required' });

  try {
    const { rows: [internship] } = await pool.query(
      `INSERT INTO internships
        (company_name, role_title, location, work_mode, stipend_text, stipend_amount, tags,
         description, requirements, duration, application_deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        company_name, role_title, location || null, work_mode || 'Hybrid',
        stipend_text || null, stipend_amount || null, tags || [],
        description || null, requirements || null, duration || null,
        application_deadline || null,
      ]
    );

    // Pre-create a row per student so the "apply" flow works immediately;
    // match_score stays NULL and is computed lazily the next time each
    // student loads their internships list (or right after they upload a CV).
    const { rows: students } = await pool.query(`SELECT id FROM users WHERE role = 'student'`);
    for (const student of students) {
      await pool.query(
        `INSERT INTO internship_applications (internship_id, user_id, status)
         VALUES ($1,$2,'suggested') ON CONFLICT DO NOTHING`,
        [internship.id, student.id]
      );
    }

    res.status(201).json({ ...internship, match_score: null, match_reason: null, application_status: 'suggested' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create internship' });
  }
});

router.post('/:id/apply', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE internship_applications SET status = 'applied'
       WHERE internship_id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Internship match not found for this user' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply' });
  }
});

module.exports = router;
