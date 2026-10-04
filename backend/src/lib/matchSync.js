const { pool } = require('../db');
const { computeMatchScores } = require('./matching');

// Ensures every internship has an application row for this student, then
// computes match scores for any that don't have one yet (score IS NULL).
// Called on internship list load and right after a resume upload.
async function syncMatchScoresForUser(userId) {
  await pool.query(
    `INSERT INTO internship_applications (internship_id, user_id, status)
     SELECT i.id, $1, 'suggested' FROM internships i
     WHERE NOT EXISTS (
       SELECT 1 FROM internship_applications ia WHERE ia.internship_id = i.id AND ia.user_id = $1
     )`,
    [userId]
  );

  const { rows: pending } = await pool.query(
    `SELECT i.* FROM internships i
     JOIN internship_applications ia ON ia.internship_id = i.id
     WHERE ia.user_id = $1 AND ia.match_score IS NULL`,
    [userId]
  );
  if (!pending.length) return;

  const { rows: [resume] } = await pool.query(
    `SELECT extracted_text FROM student_resumes WHERE user_id = $1`,
    [userId]
  );

  const results = await computeMatchScores({ resumeText: resume?.extracted_text, internships: pending });

  for (const r of results) {
    await pool.query(
      `UPDATE internship_applications SET match_score = $1, match_reason = $2
       WHERE internship_id = $3 AND user_id = $4`,
      [r.score, r.reason, r.id, userId]
    );
  }
}

module.exports = { syncMatchScoresForUser };
