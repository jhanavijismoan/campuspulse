'use strict';
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { syncMatchScoresForUser } = require('../lib/matchSync');

const router = express.Router();

const SORT_STUDENT = {
  match: 'ia.match_score DESC NULLS LAST, i.application_deadline ASC NULLS LAST',
  newest: 'i.created_at DESC',
  oldest: 'i.created_at ASC',
  stipend_desc: 'i.stipend_amount DESC NULLS LAST, i.created_at DESC',
  stipend_asc: 'i.stipend_amount ASC NULLS LAST, i.created_at DESC',
  deadline_asc: 'i.application_deadline ASC NULLS LAST',
  deadline_desc: 'i.application_deadline DESC NULLS LAST',
};

const SORT_ADMIN = {
  newest: 'i.created_at DESC',
  oldest: 'i.created_at ASC',
  stipend_desc: 'i.stipend_amount DESC NULLS LAST, i.created_at DESC',
  stipend_asc: 'i.stipend_amount ASC NULLS LAST, i.created_at DESC',
  deadline_asc: 'i.application_deadline ASC NULLS LAST',
  deadline_desc: 'i.application_deadline DESC NULLS LAST',
};

// ── LIST ────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { sort, work_mode, location, course, company, skills, stipend_min, stipend_max, deadline_before, show_closed, show_unpublished } = req.query;

    if (req.user.role === 'admin') {
      const params = [req.user.university_id];
      let where = 'WHERE i.university_id = $1';

      if (work_mode) { params.push(work_mode); where += ` AND i.work_mode = $${params.length}`; }
      if (location) { params.push(`%${location}%`); where += ` AND i.location ILIKE $${params.length}`; }
      if (company) { params.push(`%${company}%`); where += ` AND i.company_name ILIKE $${params.length}`; }
      if (course) { params.push(`%${course}%`); where += ` AND i.course ILIKE $${params.length}`; }
      if (stipend_min) { params.push(Number(stipend_min)); where += ` AND i.stipend_amount >= $${params.length}`; }
      if (stipend_max) { params.push(Number(stipend_max)); where += ` AND i.stipend_amount <= $${params.length}`; }
      if (deadline_before) { params.push(deadline_before); where += ` AND i.application_deadline <= $${params.length}`; }
      if (skills) {
        const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean);
        if (skillList.length) {
          params.push(skillList);
          where += ` AND (i.required_skills && $${params.length} OR i.preferred_skills && $${params.length})`;
        }
      }
      // Admin: by default only show published+not-taken-down unless show_unpublished=true
      if (show_unpublished !== 'true') {
        where += ` AND i.taken_down = false`;
      }

      const orderBy = SORT_ADMIN[sort] || SORT_ADMIN.newest;
      const { rows } = await pool.query(
        `SELECT i.*,
                (SELECT COUNT(*) FROM internship_applications ia WHERE ia.internship_id = i.id AND ia.status != 'suggested') AS applicant_count
         FROM internships i ${where} ORDER BY ${orderBy}`,
        params
      );
      return res.json(rows);
    }

    // Student view — only published, not taken down
    await syncMatchScoresForUser(req.user.id);

    const params = [req.user.id, req.user.university_id];
    let where = `WHERE ia.user_id = $1 AND i.university_id = $2 AND i.published = true AND i.taken_down = false`;

    if (work_mode) { params.push(work_mode); where += ` AND i.work_mode = $${params.length}`; }
    if (location) { params.push(`%${location}%`); where += ` AND i.location ILIKE $${params.length}`; }
    if (course) { params.push(`%${course}%`); where += ` AND i.course ILIKE $${params.length}`; }
    if (company) { params.push(`%${company}%`); where += ` AND i.company_name ILIKE $${params.length}`; }
    if (stipend_min) { params.push(Number(stipend_min)); where += ` AND i.stipend_amount >= $${params.length}`; }
    if (stipend_max) { params.push(Number(stipend_max)); where += ` AND i.stipend_amount <= $${params.length}`; }
    if (deadline_before) { params.push(deadline_before); where += ` AND i.application_deadline <= $${params.length}`; }
    if (skills) {
      const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (skillList.length) {
        params.push(skillList);
        where += ` AND (i.required_skills && $${params.length} OR i.preferred_skills && $${params.length})`;
      }
    }
    if (show_closed !== 'true') {
      where += ` AND (i.application_deadline IS NULL OR i.application_deadline >= CURRENT_DATE)`;
    }

    const orderBy = SORT_STUDENT[sort] || SORT_STUDENT.match;
    const { rows } = await pool.query(
      `SELECT i.id, i.company_name, i.logo_url, i.role_title, i.location, i.work_mode,
              i.stipend_text, i.stipend_amount, i.stipend_currency, i.duration,
              i.about_company, i.description, i.job_description, i.job_requirements,
              i.required_skills, i.preferred_skills, i.tags, i.eligibility, i.course, i.target_semester,
              i.publish_date, i.application_deadline, i.application_url, i.created_at,
              ia.match_score, ia.match_reason, ia.match_breakdown, ia.status AS application_status
       FROM internships i
       JOIN internship_applications ia ON ia.internship_id = i.id
       ${where} ORDER BY ${orderBy}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load internships' });
  }
});

// ── SINGLE INTERNSHIP ────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: [internship] } = await pool.query(
      `SELECT * FROM internships WHERE id = $1 AND university_id = $2`,
      [req.params.id, req.user.university_id]
    );
    if (!internship) return res.status(404).json({ error: 'Not found' });

    if (req.user.role === 'student') {
      const { rows: [app] } = await pool.query(
        `SELECT match_score, match_reason, match_breakdown, status AS application_status
         FROM internship_applications WHERE internship_id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
      );
      return res.json({ ...internship, ...app });
    }

    const { rows: appStats } = await pool.query(
      `SELECT status, COUNT(*) AS count FROM internship_applications
       WHERE internship_id = $1 AND status != 'suggested' GROUP BY status`,
      [req.params.id]
    );
    res.json({ ...internship, application_stats: appStats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load internship' });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const {
    company_name, role_title, location, work_mode, stipend_text, stipend_amount, stipend_currency,
    about_company, description, job_description, job_requirements,
    required_skills, preferred_skills, eligibility, course, target_semester,
    application_url, tags, duration, application_deadline, publish_date, published,
  } = req.body;
  if (!company_name || !role_title) return res.status(400).json({ error: 'company_name and role_title are required' });

  try {
    const { rows: [intern] } = await pool.query(
      `INSERT INTO internships (
        university_id, created_by, company_name, role_title, location, work_mode,
        stipend_text, stipend_amount, stipend_currency,
        about_company, description, job_description, job_requirements,
        required_skills, preferred_skills, eligibility, course, target_semester,
        application_url, tags, duration, application_deadline, publish_date, published, published_at
       ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
       ) RETURNING *`,
      [
        req.user.university_id, req.user.id,
        company_name, role_title,
        location || null, work_mode || 'Hybrid',
        stipend_text || null, stipend_amount || null, stipend_currency || 'INR',
        about_company || null, description || null, job_description || null, job_requirements || null,
        required_skills || [], preferred_skills || [],
        eligibility || null, course || null, target_semester || null,
        application_url || null, tags || [], duration || null,
        application_deadline || null, publish_date || null,
        published ? true : false,
        published ? new Date() : null,
      ]
    );

    // Pre-create application rows for all students in this university
    await pool.query(
      `INSERT INTO internship_applications (internship_id, user_id, status)
       SELECT $1, u.id, 'suggested' FROM users u
       WHERE u.role = 'student' AND u.university_id = $2 ON CONFLICT DO NOTHING`,
      [intern.id, req.user.university_id]
    );

    res.status(201).json(intern);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create internship' });
  }
});

// ── UPDATE ────────────────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const {
    company_name, role_title, location, work_mode, stipend_text, stipend_amount, stipend_currency,
    about_company, description, job_description, job_requirements,
    required_skills, preferred_skills, eligibility, course, target_semester,
    application_url, tags, duration, application_deadline, publish_date,
  } = req.body;

  try {
    const { rows: [existing] } = await pool.query(
      `SELECT * FROM internships WHERE id = $1 AND university_id = $2`,
      [req.params.id, req.user.university_id]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { rows: [updated] } = await pool.query(
      `UPDATE internships SET
        company_name     = COALESCE($1, company_name),
        role_title       = COALESCE($2, role_title),
        location         = COALESCE($3, location),
        work_mode        = COALESCE($4, work_mode),
        stipend_text     = COALESCE($5, stipend_text),
        stipend_amount   = COALESCE($6, stipend_amount),
        stipend_currency = COALESCE($7, stipend_currency),
        about_company    = COALESCE($8, about_company),
        description      = COALESCE($9, description),
        job_description  = COALESCE($10, job_description),
        job_requirements = COALESCE($11, job_requirements),
        required_skills  = COALESCE($12, required_skills),
        preferred_skills = COALESCE($13, preferred_skills),
        eligibility      = COALESCE($14, eligibility),
        course           = COALESCE($15, course),
        target_semester  = COALESCE($16, target_semester),
        application_url  = COALESCE($17, application_url),
        tags             = COALESCE($18, tags),
        duration         = COALESCE($19, duration),
        application_deadline = COALESCE($20, application_deadline),
        publish_date     = COALESCE($21, publish_date),
        updated_at       = now()
       WHERE id = $22 AND university_id = $23
       RETURNING *`,
      [
        company_name, role_title, location, work_mode,
        stipend_text, stipend_amount, stipend_currency,
        about_company, description, job_description, job_requirements,
        required_skills, preferred_skills,
        eligibility, course, target_semester,
        application_url, tags, duration, application_deadline, publish_date,
        req.params.id, req.user.university_id,
      ]
    );

    // Invalidate match scores so they get recomputed on next view
    await pool.query(
      `UPDATE internship_applications SET match_score = NULL, match_reason = NULL, match_breakdown = NULL
       WHERE internship_id = $1`,
      [req.params.id]
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update internship' });
  }
});

// ── PUBLISH ───────────────────────────────────────────────────────────────────
router.post('/:id/publish', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [intern] } = await pool.query(
      `UPDATE internships SET published = true, published_at = now(), taken_down = false, updated_at = now()
       WHERE id = $1 AND university_id = $2 RETURNING *`,
      [req.params.id, req.user.university_id]
    );
    if (!intern) return res.status(404).json({ error: 'Not found' });
    res.json(intern);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to publish' });
  }
});

// ── UNPUBLISH ─────────────────────────────────────────────────────────────────
router.post('/:id/unpublish', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [intern] } = await pool.query(
      `UPDATE internships SET published = false, updated_at = now()
       WHERE id = $1 AND university_id = $2 RETURNING *`,
      [req.params.id, req.user.university_id]
    );
    if (!intern) return res.status(404).json({ error: 'Not found' });
    res.json(intern);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unpublish' });
  }
});

// ── TAKEDOWN ──────────────────────────────────────────────────────────────────
router.post('/:id/takedown', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [intern] } = await pool.query(
      `UPDATE internships SET taken_down = true, taken_down_at = now(), taken_down_by = $1,
              published = false, updated_at = now()
       WHERE id = $2 AND university_id = $3 RETURNING *`,
      [req.user.id, req.params.id, req.user.university_id]
    );
    if (!intern) return res.status(404).json({ error: 'Not found' });
    res.json(intern);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to take down' });
  }
});

// ── RESTORE (undo takedown) ───────────────────────────────────────────────────
router.post('/:id/restore', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [intern] } = await pool.query(
      `UPDATE internships SET taken_down = false, taken_down_at = NULL, taken_down_by = NULL, updated_at = now()
       WHERE id = $1 AND university_id = $2 RETURNING *`,
      [req.params.id, req.user.university_id]
    );
    if (!intern) return res.status(404).json({ error: 'Not found' });
    res.json(intern);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restore' });
  }
});

// ── APPLY (student) ───────────────────────────────────────────────────────────
router.post('/:id/apply', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
  try {
    const { rows: [intern] } = await pool.query(
      `SELECT id, published, taken_down FROM internships WHERE id = $1 AND university_id = $2`,
      [req.params.id, req.user.university_id]
    );
    if (!intern) return res.status(404).json({ error: 'Not found' });
    if (!intern.published || intern.taken_down) return res.status(400).json({ error: 'This internship is not open for applications' });

    const { rows } = await pool.query(
      `INSERT INTO internship_applications (internship_id, user_id, status)
       VALUES ($1, $2, 'applied')
       ON CONFLICT (internship_id, user_id) DO UPDATE SET status = 'applied'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply' });
  }
});

module.exports = router;
