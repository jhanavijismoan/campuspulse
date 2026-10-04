const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [{ rows: [studentCount] }, { rows: [annCount] }] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM announcements`),
    ]);

    const { rows: [appStats] } = await pool.query(
      `SELECT COUNT(*)::int AS total_applications FROM internship_applications`
    );

    const { rows: deadlines } = await pool.query(
      `SELECT title, due_date, priority, affected_students FROM deadlines ORDER BY due_date ASC`
    );

    const { rows: topQueries } = await pool.query(
      `SELECT query_text, hit_count FROM ai_queries ORDER BY hit_count DESC LIMIT 5`
    );

    const { rows: [insight] } = await pool.query(
      `SELECT insight_text FROM admin_insights ORDER BY created_at DESC LIMIT 1`
    );

    res.json({
      active_students: studentCount.count,
      announcements_count: annCount.count,
      announcements_viewed_pct: 89, // placeholder engagement metric
      internship_applications: appStats.total_applications,
      deadlines,
      top_queries: topQueries,
      ai_insight: insight?.insight_text || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

module.exports = router;
