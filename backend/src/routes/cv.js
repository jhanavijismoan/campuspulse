'use strict';
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { isOllamaConfigured, generateJSON } = require('../lib/ai');
const { syncMatchScoresForUser } = require('../lib/matchSync');

const router = express.Router();

// ── GET /cv — load the student's full CV profile ──────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM cv_profiles WHERE user_id = $1`, [req.user.id]);
    const profile = rows[0] || null;

    // Also attach active_cv_source so the frontend knows which is active
    const { rows: resumeRows } = await pool.query(
      `SELECT id, file_url, original_filename, updated_at, active_cv_source FROM student_resumes WHERE user_id = $1`,
      [req.user.id]
    );
    const resume = resumeRows[0] || null;

    res.json({
      profile,
      uploaded_cv: resume ? { id: resume.id, file_url: resume.file_url, original_filename: resume.original_filename, updated_at: resume.updated_at } : null,
      active_cv_source: resume?.active_cv_source || (profile ? 'built' : null),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load CV' });
  }
});

// ── POST /cv/save — save structured CV data (draft) ──────────────────────────
router.post('/save', requireAuth, async (req, res) => {
  const {
    personal_info, sections, answers, structured_cv,
    target_role, tone,
  } = req.body;

  // Build structured plain text for matching
  const structured_text = buildStructuredText({ personal_info: personal_info || {}, structured_cv: structured_cv || answers || {}, sections: sections || [] });

  try {
    const { rows } = await pool.query(
      `INSERT INTO cv_profiles
         (user_id, personal_info, sections, answers, structured_cv, structured_text, target_role, tone, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
       ON CONFLICT (user_id) DO UPDATE SET
         personal_info   = EXCLUDED.personal_info,
         sections        = EXCLUDED.sections,
         answers         = EXCLUDED.answers,
         structured_cv   = EXCLUDED.structured_cv,
         structured_text = EXCLUDED.structured_text,
         target_role     = EXCLUDED.target_role,
         tone            = EXCLUDED.tone,
         updated_at      = now()
       RETURNING *`,
      [
        req.user.id,
        JSON.stringify(personal_info || {}),
        JSON.stringify(sections || []),
        JSON.stringify(answers || {}),
        JSON.stringify(structured_cv || {}),
        structured_text,
        target_role || null,
        tone || 'professional',
      ]
    );

    // If built CV is the active source, push structured_text into student_resumes for matching
    const { rows: resumeRows } = await pool.query(
      `SELECT active_cv_source FROM student_resumes WHERE user_id = $1`,
      [req.user.id]
    );
    const isBuiltActive = !resumeRows[0] || resumeRows[0].active_cv_source === 'built';
    if (isBuiltActive && structured_text) {
      await _activateBuiltCV(req.user.id, structured_text);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save CV' });
  }
});

// ── POST /cv/generate — AI-polished generation ────────────────────────────────
router.post('/generate', requireAuth, async (req, res) => {
  const { target_role, tone, sections, answers, personal_info } = req.body;
  if (!Array.isArray(sections) || !sections.length) {
    return res.status(400).json({ error: 'Select at least one section' });
  }

  try {
    const { rows: [user] } = await pool.query(
      `SELECT full_name, email, program, semester, section FROM users WHERE id = $1`,
      [req.user.id]
    );

    let generated;
    let generatedBy = 'template';

    if (isOllamaConfigured()) {
      try {
        const parsed = await generateJSON(buildPrompt({ user, personal_info: personal_info || {}, target_role, tone, sections, answers }));
        generated = normalizeCV(parsed, sections);
        generatedBy = 'ai';
      } catch (aiErr) {
        console.error('AI generation failed, falling back to template:', aiErr.message);
      }
    }

    if (!generated) {
      generated = generateFromTemplate({ user, personal_info: personal_info || {}, target_role, tone, sections, answers });
    }

    const structured_text = buildStructuredText({ personal_info: personal_info || {}, structured_cv: generated, sections });
    const generatedText = structured_text;

    const { rows } = await pool.query(
      `INSERT INTO cv_profiles
         (user_id, personal_info, target_role, tone, sections, answers, structured_cv, generated_cv, structured_text, generated_text, generated_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
       ON CONFLICT (user_id) DO UPDATE SET
         personal_info   = EXCLUDED.personal_info,
         target_role     = EXCLUDED.target_role,
         tone            = EXCLUDED.tone,
         sections        = EXCLUDED.sections,
         answers         = EXCLUDED.answers,
         structured_cv   = EXCLUDED.structured_cv,
         generated_cv    = EXCLUDED.generated_cv,
         structured_text = EXCLUDED.structured_text,
         generated_text  = EXCLUDED.generated_text,
         generated_by    = EXCLUDED.generated_by,
         updated_at      = now()
       RETURNING *`,
      [
        req.user.id,
        JSON.stringify(personal_info || {}),
        target_role || null, tone || 'professional',
        JSON.stringify(sections), JSON.stringify(answers || {}),
        JSON.stringify(generated), JSON.stringify(generated),
        structured_text, generatedText, generatedBy,
      ]
    );

    // Sync matching if built CV is active
    const { rows: resumeRows } = await pool.query(
      `SELECT active_cv_source FROM student_resumes WHERE user_id = $1`,
      [req.user.id]
    );
    const isBuiltActive = !resumeRows[0] || resumeRows[0].active_cv_source === 'built';
    if (isBuiltActive && structured_text) {
      await _activateBuiltCV(req.user.id, structured_text);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate CV' });
  }
});

// ── POST /cv/activate — set which CV is active for matching ───────────────────
// body: { source: 'built' | 'uploaded' }
router.post('/activate', requireAuth, async (req, res) => {
  const { source } = req.body;
  if (!['built', 'uploaded'].includes(source)) {
    return res.status(400).json({ error: "source must be 'built' or 'uploaded'" });
  }

  try {
    if (source === 'built') {
      // Get structured_text from cv_profiles
      const { rows: cvRows } = await pool.query(
        `SELECT structured_text FROM cv_profiles WHERE user_id = $1`,
        [req.user.id]
      );
      if (!cvRows[0]?.structured_text) {
        return res.status(400).json({ error: 'No built CV found. Save your CV first.' });
      }
      await _activateBuiltCV(req.user.id, cvRows[0].structured_text);
    } else {
      // Activate the uploaded file — set active_cv_source back to uploaded
      // Restore the uploaded file's extracted_text
      const { rows } = await pool.query(
        `UPDATE student_resumes SET active_cv_source = 'uploaded', updated_at = now()
         WHERE user_id = $1 RETURNING extracted_text`,
        [req.user.id]
      );
      if (!rows[0]) return res.status(400).json({ error: 'No uploaded CV found.' });
      // Re-sync match scores based on the uploaded CV's text
      await pool.query(
        `UPDATE internship_applications SET match_score = NULL, match_reason = NULL, match_breakdown = NULL WHERE user_id = $1`,
        [req.user.id]
      );
      await syncMatchScoresForUser(req.user.id);
    }

    const { rows: resumeRows } = await pool.query(
      `SELECT active_cv_source FROM student_resumes WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ active_cv_source: resumeRows[0]?.active_cv_source || source });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to switch active CV' });
  }
});

// ── Helper: push built CV text into student_resumes and sync matching ─────────
async function _activateBuiltCV(userId, structuredText) {
  // Upsert a "built" row into student_resumes using the structured text
  await pool.query(
    `INSERT INTO student_resumes (user_id, file_url, original_filename, extracted_text, active_cv_source, updated_at)
     VALUES ($1, 'built', 'Built CV', $2, 'built', now())
     ON CONFLICT (user_id) DO UPDATE SET
       extracted_text   = EXCLUDED.extracted_text,
       active_cv_source = 'built',
       updated_at       = now()`,
    [userId, structuredText]
  );
  // Invalidate + re-compute match scores
  await pool.query(
    `UPDATE internship_applications SET match_score = NULL, match_reason = NULL, match_breakdown = NULL WHERE user_id = $1`,
    [userId]
  );
  await syncMatchScoresForUser(userId);
}

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// Text rendering — converts structured CV JSON to a plain text string that the
// keyword-based matching algorithm can work with.
// ─────────────────────────────────────────────────────────────────────────────
function buildStructuredText({ personal_info, structured_cv, sections }) {
  const lines = [];
  const pi = personal_info || {};

  if (pi.name) lines.push(pi.name);
  if (pi.email) lines.push(pi.email);
  if (pi.phone) lines.push(pi.phone);
  if (pi.location) lines.push(pi.location);
  if (pi.linkedin) lines.push(pi.linkedin);
  if (pi.github) lines.push(pi.github);
  if (pi.portfolio) lines.push(pi.portfolio);
  lines.push('');

  const cv = structured_cv || {};
  const order = sections && sections.length ? sections : Object.keys(cv);

  for (const key of order) {
    const data = cv[key];
    if (!data || (Array.isArray(data) && !data.length)) continue;

    const title = { summary: 'SUMMARY', education: 'EDUCATION', experience: 'EXPERIENCE', projects: 'PROJECTS', skills: 'SKILLS', certifications: 'CERTIFICATIONS', achievements: 'ACHIEVEMENTS', extracurricular: 'EXTRACURRICULAR ACTIVITIES', languages: 'LANGUAGES', interests: 'INTERESTS' }[key] || key.toUpperCase();
    lines.push(title);

    if (typeof data === 'string') {
      lines.push(data);
    } else if (key === 'skills' || key === 'languages' || key === 'interests') {
      lines.push(Array.isArray(data) ? data.join(', ') : String(data));
    } else if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'string') { lines.push(item); continue; }
        const parts = [item.institution || item.name || item.title || item.company || item.role || item.org || ''];
        if (item.degree) parts.push(item.degree);
        if (item.course) parts.push(item.course);
        if (item.cgpa) parts.push(`CGPA: ${item.cgpa}`);
        if (item.period || item.start_date) {
          const periodStr = item.period || `${item.start_date || ''}${item.end_date ? ` - ${item.end_date}` : ''}`;
          parts.push(periodStr);
        }
        if (item.issuer) parts.push(item.issuer);
        if (item.date) parts.push(item.date);
        if (item.detail || item.description) parts.push(item.detail || item.description);
        if (item.technologies) parts.push(`Technologies: ${item.technologies}`);
        if (item.tools) parts.push(`Tools: ${item.tools}`);
        if (item.achievements) parts.push(item.achievements);
        lines.push(parts.filter(Boolean).join(' | '));
        if (Array.isArray(item.bullets)) item.bullets.forEach((b) => lines.push(`- ${b}`));
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// AI prompt builder
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt({ user, personal_info, target_role, tone, sections, answers }) {
  const name = personal_info.name || user.full_name;
  return `You are a professional resume writer helping a student build a personalized CV.

Student: ${name}
Program: ${user.program || ''} ${user.semester || ''} ${user.section || ''}
Target role: ${target_role || 'general/internship'}
Tone: ${tone || 'professional'}
Sections requested: ${sections.join(', ')}

Student's raw input:
${JSON.stringify(answers, null, 2)}

Turn rough notes into polished, concise, resume-quality writing. Use strong action verbs. Quantify only where numbers were given. Never invent employers, numbers, or dates.

Respond ONLY with valid JSON (no markdown), shape:
{
  "summary": "2-3 sentence professional summary",
  "education": [{ "institution": "", "degree": "", "course": "", "period": "", "cgpa": "" }],
  "experience": [{ "title": "", "company": "", "period": "", "description": "", "bullets": [""] }],
  "projects": [{ "title": "", "description": "", "technologies": "", "bullets": [""] }],
  "skills": ["skill1", "skill2"],
  "certifications": [{ "name": "", "issuer": "", "date": "" }],
  "achievements": [{ "title": "", "detail": "" }],
  "extracurricular": [{ "title": "", "detail": "" }],
  "languages": ["language1"],
  "interests": ["interest1"]
}`;
}

function normalizeCV(parsed, sections) {
  const out = {};
  for (const key of sections) {
    if (parsed[key] !== undefined) out[key] = parsed[key];
  }
  return out;
}

function generateFromTemplate({ user, personal_info, target_role, tone, sections, answers }) {
  const cv = {};
  const name = personal_info.name || user.full_name;

  if (sections.includes('summary')) {
    const bits = [];
    if (target_role) bits.push(`Aspiring ${target_role}`);
    if (user.program) bits.push(`currently pursuing ${user.program}${user.semester ? ` (${user.semester})` : ''}`);
    if (answers.summary?.strengths) bits.push(`with strengths in ${answers.summary.strengths}`);
    const s1 = bits.length ? `${bits.join(', ')}.` : '';
    const s2 = answers.summary?.goal ? ` ${answers.summary.goal.replace(/\.$/, '')}.` : '';
    cv.summary = (s1 + s2).trim() || `Motivated ${user.program || 'student'} eager to apply academic knowledge in a professional setting.`;
  }

  if (sections.includes('education') && answers.education) {
    const edu = Array.isArray(answers.education) ? answers.education : [answers.education];
    cv.education = edu.map((e) => ({
      institution: e.institution || 'Mount Carmel (Deemed to be) University',
      degree: e.degree || user.program || '',
      course: e.course || '',
      period: e.period || e.start_date ? `${e.start_date || ''}${e.end_date ? ` - ${e.end_date}` : ''}` : user.semester || '',
      cgpa: e.cgpa || '',
    })).filter((e) => e.institution);
  }

  if (sections.includes('experience') && Array.isArray(answers.experience)) {
    cv.experience = answers.experience.filter((e) => e?.title || e?.company).map((e) => ({
      title: e.title || e.role || '',
      company: e.company || e.org || '',
      period: e.period || (e.start_date ? `${e.start_date}${e.end_date ? ` - ${e.end_date}` : ''}` : ''),
      description: e.description || '',
      bullets: (e.description || '').split('\n').map((s) => s.trim()).filter(Boolean),
      achievements: e.achievements || '',
    }));
  }

  if (sections.includes('projects') && Array.isArray(answers.projects)) {
    cv.projects = answers.projects.filter((p) => p?.title).map((p) => ({
      title: p.title || '',
      description: p.description || '',
      technologies: p.technologies || p.tools || '',
      bullets: (p.description || '').split('\n').map((s) => s.trim()).filter(Boolean),
    }));
  }

  if (sections.includes('skills')) {
    const raw = answers.skills;
    if (Array.isArray(raw)) cv.skills = raw;
    else if (typeof raw === 'string') cv.skills = raw.split(',').map((s) => s.trim()).filter(Boolean);
    else cv.skills = [];
  }

  if (sections.includes('certifications') && Array.isArray(answers.certifications)) {
    cv.certifications = answers.certifications.filter((c) => c?.name).map((c) => ({
      name: c.name, issuer: c.issuer || '', date: c.date || '',
    }));
  }

  if (sections.includes('achievements') && Array.isArray(answers.achievements)) {
    cv.achievements = answers.achievements.filter((a) => a?.title).map((a) => ({
      title: a.title, detail: a.description || a.detail || '',
    }));
  }

  if (sections.includes('extracurricular') && Array.isArray(answers.extracurricular)) {
    cv.extracurricular = answers.extracurricular.filter((a) => a?.title).map((a) => ({
      title: a.title, detail: a.description || a.detail || '',
    }));
  }

  if (sections.includes('languages')) {
    const raw = answers.languages;
    cv.languages = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []);
  }

  if (sections.includes('interests')) {
    const raw = answers.interests;
    cv.interests = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []);
  }

  return cv;
}
