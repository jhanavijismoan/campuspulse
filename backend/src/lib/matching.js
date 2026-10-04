const { isOllamaConfigured, generateJSON } = require('./ai');

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'a', 'an', 'to', 'of', 'in', 'on', 'is', 'are', 'be', 'as',
  'this', 'that', 'or', 'at', 'by', 'from', 'it', 'we', 'you', 'your', 'i', 'will', 'have',
  'has', 'our', 'their', 'was', 'were', 'not', 'but', 'they', 'them', 'he', 'she', 'his', 'her',
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Deterministic fallback — no API key required. Scores how much resume text
// overlaps with an internship's tags, role title, and description/requirements.
function matchWithKeywords({ resumeText, internship }) {
  const resumeSet = new Set(tokenize(resumeText));
  let score = 40;

  const tags = internship.tags || [];
  let tagHits = 0;
  for (const tag of tags) {
    if (tokenize(tag).some((w) => resumeSet.has(w))) tagHits++;
  }
  if (tags.length) score += Math.round((tagHits / tags.length) * 35);

  const roleWords = tokenize(internship.role_title);
  const roleHits = roleWords.filter((w) => resumeSet.has(w)).length;
  if (roleWords.length) score += Math.round((roleHits / roleWords.length) * 15);

  const reqWords = new Set(tokenize(`${internship.description || ''} ${internship.requirements || ''}`));
  const overlap = [...resumeSet].filter((w) => reqWords.has(w)).length;
  score += Math.min(10, Math.round(overlap / 8));

  score = Math.max(30, Math.min(96, score));
  const reason = tagHits
    ? `Matches ${tagHits}/${tags.length} key skills/tags from your CV.`
    : 'Based on keyword overlap between your CV and this role.';

  return { id: internship.id, score, reason };
}

async function matchWithOllama({ resumeText, internships }) {
  const prompt = `You are matching a student's resume against a list of internship opportunities.

RESUME:
${resumeText.slice(0, 6000)}

INTERNSHIPS (JSON):
${JSON.stringify(
  internships.map((i) => ({
    id: i.id, role: i.role_title, company: i.company_name,
    tags: i.tags, description: i.description, requirements: i.requirements,
  })),
  null, 2
)}

For each internship, score how well the resume matches it from 0-100 based on relevant skills,
experience, and coursework. Be realistic and differentiate between strong and weak matches —
don't give everything a similarly high score. Give a one-sentence reason for each score that
references something specific from the resume.

Respond with ONLY a valid JSON array, no other text, in this exact shape:
[{ "id": 1, "score": 82, "reason": "Strong match: resume lists Excel and data analysis, which are core to this role." }]`;

  const parsed = await generateJSON(prompt);
  const list = Array.isArray(parsed) ? parsed : parsed.matches || parsed.results || [];

  const byId = new Map(list.map((r) => [r.id, r]));
  return internships.map((i) => {
    const match = byId.get(i.id);
    return match && Number.isFinite(Number(match.score))
      ? { id: i.id, score: Math.max(0, Math.min(100, Math.round(match.score))), reason: match.reason }
      : matchWithKeywords({ resumeText, internship: i });
  });
}

// Main entry point. Returns [{ id, score, reason }] — score/reason are null
// when there's no resume text to compare against yet.
async function computeMatchScores({ resumeText, internships }) {
  if (!internships.length) return [];
  if (!resumeText || !resumeText.trim()) {
    return internships.map((i) => ({ id: i.id, score: null, reason: null }));
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
