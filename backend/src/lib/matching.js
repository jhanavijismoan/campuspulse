'use strict';
const { isOllamaConfigured, generateJSON } = require('./ai');

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'a', 'an', 'to', 'of', 'in', 'on', 'is', 'are', 'be', 'as',
  'this', 'that', 'or', 'at', 'by', 'from', 'it', 'we', 'you', 'your', 'i', 'will', 'have',
  'has', 'our', 'their', 'was', 'were', 'not', 'but', 'they', 'them', 'he', 'she', 'his', 'her',
  'etc', 'per', 'via', 'any', 'all', 'one', 'two', 'able', 'also', 'well',
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function tokenSet(text) {
  return new Set(tokenize(text));
}

// Returns 0-100 fraction of `skills` array found in the resume token set.
function skillsOverlap(resumeSet, skills) {
  if (!skills || !skills.length) return null;
  let hits = 0;
  for (const skill of skills) {
    if (tokenize(skill).some((w) => resumeSet.has(w))) hits++;
  }
  return Math.round((hits / skills.length) * 100);
}

// Simple heuristic: look for education-related keywords in resume.
function educationMatch(resumeSet, eligibility, course) {
  if (!eligibility && !course) return null;
  const target = tokenize(`${eligibility || ''} ${course || ''}`);
  if (!target.length) return null;
  const hits = target.filter((w) => resumeSet.has(w)).length;
  return Math.round((hits / target.length) * 100);
}

// Look for experience-related years/roles/keywords in resume.
function experienceMatch(resumeSet, jobDescription, requirements) {
  const combined = tokenize(`${jobDescription || ''} ${requirements || ''}`);
  if (!combined.length) return null;
  const reqSet = new Set(combined);
  const overlap = [...resumeSet].filter((w) => reqSet.has(w)).length;
  // Normalise: 1 overlap per 3 distinct requirement words → 33% of max points
  return Math.min(100, Math.round((overlap / Math.max(1, reqSet.size)) * 300));
}

// Broad keyword overlap across all text fields.
function keywordsMatch(resumeSet, internship) {
  const blob = tokenize(
    [
      internship.description, internship.job_description,
      internship.requirements, internship.job_requirements,
      (internship.tags || []).join(' '),
      (internship.required_skills || []).join(' '),
      (internship.preferred_skills || []).join(' '),
    ].join(' ')
  );
  if (!blob.length) return null;
  const blobSet = new Set(blob);
  const hits = [...resumeSet].filter((w) => blobSet.has(w)).length;
  return Math.min(100, Math.round((hits / Math.max(1, blobSet.size)) * 300));
}

// Weights for weighted average
const WEIGHTS = {
  skills: 0.45,
  education: 0.15,
  experience: 0.20,
  keywords: 0.20,
};

function matchWithKeywords({ resumeText, internship }) {
  const resumeSet = tokenSet(resumeText);

  const required_skills = internship.required_skills || [];
  const preferred_skills = internship.preferred_skills || [];
  const allSkills = [...new Set([...required_skills, ...preferred_skills])];

  const skillsPct = skillsOverlap(resumeSet, allSkills.length ? allSkills : internship.tags || []);
  const educationPct = educationMatch(resumeSet, internship.eligibility, internship.course);
  const experiencePct = experienceMatch(resumeSet, internship.job_description, internship.job_requirements || internship.requirements);
  const keywordsPct = keywordsMatch(resumeSet, internship);

  // Weighted score — skip dimensions with no data (null) and redistribute weight
  let totalWeight = 0;
  let weightedSum = 0;
  const dims = [
    { name: 'skills', value: skillsPct },
    { name: 'education', value: educationPct },
    { name: 'experience', value: experiencePct },
    { name: 'keywords', value: keywordsPct },
  ];
  for (const d of dims) {
    if (d.value !== null) {
      weightedSum += d.value * WEIGHTS[d.name];
      totalWeight += WEIGHTS[d.name];
    }
  }
  const rawScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 0.7 + 30) : 30;
  const score = Math.max(10, Math.min(96, rawScore));

  const breakdown = {
    skills: skillsPct,
    education: educationPct,
    experience: experiencePct,
    keywords: keywordsPct,
  };

  const reqHits = required_skills.filter((s) => tokenize(s).some((w) => resumeSet.has(w)));
  const reason = reqHits.length
    ? `Matched ${reqHits.length}/${required_skills.length} required skill${required_skills.length !== 1 ? 's' : ''}: ${reqHits.slice(0, 3).join(', ')}${reqHits.length > 3 ? '…' : ''}.`
    : skillsPct != null && skillsPct > 0
    ? 'Partial skill overlap detected in your CV.'
    : 'Based on keyword overlap between your CV and this role.';

  return { id: internship.id, score, reason, breakdown };
}

async function matchWithOllama({ resumeText, internships }) {
  const prompt = `You are matching a student's resume against internship opportunities.

RESUME:
${resumeText.slice(0, 6000)}

INTERNSHIPS:
${JSON.stringify(
  internships.map((i) => ({
    id: i.id, role: i.role_title, company: i.company_name,
    required_skills: i.required_skills, preferred_skills: i.preferred_skills,
    tags: i.tags, description: i.description, requirements: i.requirements,
  })),
  null, 2
)}

For each internship produce an honest, differentiated match score 0-100, a one-sentence reason, and a breakdown object with keys skills (0-100), education (0-100), experience (0-100), keywords (0-100) each as integers or null if unknown.

Respond ONLY with valid JSON:
[{ "id": 1, "score": 82, "reason": "...", "breakdown": { "skills": 85, "education": 70, "experience": 60, "keywords": 75 } }]`;

  const parsed = await generateJSON(prompt);
  const list = Array.isArray(parsed) ? parsed : parsed.matches || parsed.results || [];
  const byId = new Map(list.map((r) => [r.id, r]));

  return internships.map((i) => {
    const match = byId.get(i.id);
    if (match && Number.isFinite(Number(match.score))) {
      return {
        id: i.id,
        score: Math.max(0, Math.min(100, Math.round(match.score))),
        reason: match.reason,
        breakdown: match.breakdown || null,
      };
    }
    return matchWithKeywords({ resumeText, internship: i });
  });
}

async function computeMatchScores({ resumeText, internships }) {
  if (!internships.length) return [];
  if (!resumeText || !resumeText.trim()) {
    return internships.map((i) => ({ id: i.id, score: null, reason: null, breakdown: null }));
  }

  if (isOllamaConfigured()) {
    try {
      return await matchWithOllama({ resumeText, internships });
    } catch (err) {
      console.error('AI matching failed, falling back to keyword matching:', err.message);
    }
  }

  return internships.map((i) => matchWithKeywords({ resumeText, internship: i }));
}

module.exports = { computeMatchScores };
