const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { isOllamaConfigured, generateJSON } = require('../lib/ai');

const router = express.Router();

// The full catalogue of sections a student can toggle on/off. `fields`
// describes the shape of a single entry for repeatable sections (used by
// both the frontend wizard and the fallback text formatter below) — the
// frontend is the source of truth for the UI, this is just for reference.
const SECTION_KEYS = [
  'summary', 'education', 'experience', 'projects',
  'skills', 'certifications', 'achievements', 'extracurricular', 'languages',
];

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM cv_profiles WHERE user_id = $1`, [req.user.id]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load CV profile' });
  }
});

router.post('/generate', requireAuth, async (req, res) => {
  const { target_role, tone, sections, answers } = req.body;
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
        const parsed = await generateJSON(buildPrompt({ user, target_role, tone, sections, answers }));
        generated = normalizeCV(parsed, sections);
        generatedBy = 'ai';
      } catch (aiErr) {
        console.error('Ollama generation failed, falling back to template:', aiErr.message);
      }
    }

    if (!generated) {
      generated = generateFromTemplate({ user, target_role, tone, sections, answers });
    }

    const generatedText = renderPlainText({ user, target_role, cv: generated, sections });

    const { rows } = await pool.query(
      `INSERT INTO cv_profiles (user_id, target_role, tone, sections, answers, generated_cv, generated_text, generated_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
       ON CONFLICT (user_id) DO UPDATE SET
         target_role = EXCLUDED.target_role,
         tone = EXCLUDED.tone,
         sections = EXCLUDED.sections,
         answers = EXCLUDED.answers,
         generated_cv = EXCLUDED.generated_cv,
         generated_text = EXCLUDED.generated_text,
         generated_by = EXCLUDED.generated_by,
         updated_at = now()
       RETURNING *`,
      [req.user.id, target_role || null, tone || 'professional', JSON.stringify(sections), JSON.stringify(answers || {}), JSON.stringify(generated), generatedText, generatedBy]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate CV' });
  }
});

module.exports = router;

// ---------------------------------------------------------------------
// AI generation (real) — only runs if OLLAMA_MODEL is set in .env.
// The actual API call lives in ../lib/ai.js (shared with internship matching);
// this file just builds the prompt and normalizes the response shape.
// ---------------------------------------------------------------------

function buildPrompt({ user, target_role, tone, sections, answers }) {
  return `You are a professional resume writer helping a college student build a personalized CV.

Student name: ${user.full_name}
Program: ${user.program || ''} ${user.semester || ''} ${user.section || ''}
Target role / industry: ${target_role || 'Not specified — keep it general'}
Desired tone: ${tone || 'professional'}
Sections to include (in this order): ${sections.join(', ')}

Below is the raw information the student provided for each section they chose. Only use
information the student actually gave — never invent employers, numbers, dates, or
achievements that weren't provided. Turn rough notes into polished, concise, resume-style
writing: strong action verbs, quantify impact only where the student gave numbers, no filler.

STUDENT INPUT (JSON):
${JSON.stringify(answers, null, 2)}

Respond with ONLY valid JSON (no markdown fences, no commentary) matching this exact shape,
omitting keys for sections not in the sections list:
{
  "summary": "2-3 sentence professional summary as a single string",
  "education": [{ "institution": "", "detail": "", "period": "" }],
  "experience": [{ "title": "", "org": "", "period": "", "bullets": ["", ""] }],
  "projects": [{ "title": "", "detail": "", "bullets": ["", ""] }],
  "skills": ["skill1", "skill2"],
  "certifications": [{ "name": "", "issuer": "", "date": "" }],
  "achievements": [{ "title": "", "detail": "" }],
  "extracurricular": [{ "title": "", "detail": "" }],
  "languages": ["language1", "language2"]
}`;
}

function normalizeCV(parsed, sections) {
  const out = {};
  for (const key of sections) {
    if (parsed[key] !== undefined) out[key] = parsed[key];
  }
  return out;
}

// ---------------------------------------------------------------------
// Deterministic fallback — used when no API key is configured, or if the
// AI call fails, so the feature always works end-to-end.
// ---------------------------------------------------------------------
function generateFromTemplate({ user, target_role, tone, sections, answers }) {
  const cv = {};

  if (sections.includes('summary')) {
    const introBits = [];
    if (target_role) introBits.push(`Aspiring ${target_role}`);
    if (user.program) introBits.push(`currently pursuing ${user.program}${user.semester ? ` (${user.semester})` : ''}`);
    if (answers.summary?.strengths) introBits.push(`with strengths in ${answers.summary.strengths}`);
    const sentence1 = introBits.length ? `${introBits.join(', ')}.` : '';
    const sentence2 = answers.summary?.goal ? ` ${answers.summary.goal.replace(/\.$/, '')}.` : '';
    cv.summary = (sentence1 + sentence2).trim() || 'Motivated student eager to apply academic knowledge in a professional setting.';
  }

  if (sections.includes('education')) {
    cv.education = [{
      institution: answers.education?.institution || 'Mount Carmel (Deemed to be) University',
      detail: [user.program, answers.education?.cgpa ? `CGPA: ${answers.education.cgpa}` : null].filter(Boolean).join(' — '),
      period: answers.education?.period || user.semester || '',
    }];
  }

  if (sections.includes('experience') && Array.isArray(answers.experience)) {
    cv.experience = answers.experience.filter((e) => e?.title || e?.org).map((e) => ({
      title: e.title || '', org: e.org || '', period: e.period || '',
      bullets: (e.description || '').split('\n').map((s) => s.trim()).filter(Boolean),
    }));
  }

  if (sections.includes('projects') && Array.isArray(answers.projects)) {
    cv.projects = answers.projects.filter((p) => p?.title).map((p) => ({
      title: p.title || '', detail: p.tools || '',
      bullets: (p.description || '').split('\n').map((s) => s.trim()).filter(Boolean),
    }));
  }

  if (sections.includes('skills') && answers.skills) {
    cv.skills = String(answers.skills).split(',').map((s) => s.trim()).filter(Boolean);
  }

  if (sections.includes('certifications') && Array.isArray(answers.certifications)) {
    cv.certifications = answers.certifications.filter((c) => c?.name).map((c) => ({
      name: c.name || '', issuer: c.issuer || '', date: c.date || '',
    }));
  }

  if (sections.includes('achievements') && Array.isArray(answers.achievements)) {
    cv.achievements = answers.achievements.filter((a) => a?.title).map((a) => ({
      title: a.title || '', detail: a.description || '',
    }));
  }

  if (sections.includes('extracurricular') && Array.isArray(answers.extracurricular)) {
    cv.extracurricular = answers.extracurricular.filter((a) => a?.title).map((a) => ({
      title: a.title || '', detail: a.description || '',
    }));
  }

  if (sections.includes('languages') && answers.languages) {
    cv.languages = String(answers.languages).split(',').map((s) => s.trim()).filter(Boolean);
  }

  return cv;
}

function renderPlainText({ user, target_role, cv, sections }) {
  const lines = [user.full_name, target_role ? `Target Role: ${target_role}` : '', ''];
  const titleFor = {
    summary: 'Summary', education: 'Education', experience: 'Experience', projects: 'Projects',
    skills: 'Skills', certifications: 'Certifications', achievements: 'Achievements',
    extracurricular: 'Extracurricular', languages: 'Languages',
  };

  for (const key of sections) {
    const data = cv[key];
    if (!data || (Array.isArray(data) && !data.length)) continue;
    lines.push(titleFor[key].toUpperCase(), '-'.repeat(titleFor[key].length));

    if (key === 'summary') lines.push(data, '');
    else if (key === 'skills' || key === 'languages') lines.push(data.join(', '), '');
    else if (Array.isArray(data)) {
      data.forEach((item) => {
        if (key === 'education') lines.push(`${item.institution}${item.period ? ` (${item.period})` : ''}`, item.detail || '');
        else if (key === 'experience' || key === 'projects') {
          lines.push(`${item.title}${item.org ? ` — ${item.org}` : ''}${item.period ? ` (${item.period})` : ''}`);
          (item.bullets || []).forEach((b) => lines.push(`  - ${b}`));
        } else if (key === 'certifications') {
          lines.push(`${item.name}${item.issuer ? ` — ${item.issuer}` : ''}${item.date ? ` (${item.date})` : ''}`);
        } else {
          lines.push(`${item.title}${item.detail ? ` — ${item.detail}` : ''}`);
        }
      });
      lines.push('');
    }
  }
  return lines.join('\n').trim();
}
