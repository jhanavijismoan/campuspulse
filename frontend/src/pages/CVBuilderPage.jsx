import { useEffect, useState } from 'react';
import {
  Sparkles, Plus, X, Loader2, Printer, RefreshCw, Pencil, FileText,
  GraduationCap, Briefcase, FolderKanban, Wrench, Award, Trophy, Users, Languages as LanguagesIcon,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const SECTION_META = [
  { key: 'summary', label: 'Professional Summary', icon: FileText, hint: 'A short intro paragraph at the top of your CV.' },
  { key: 'education', label: 'Education', icon: GraduationCap, hint: 'Your degree, institution, and academic details.' },
  { key: 'experience', label: 'Experience', icon: Briefcase, hint: 'Internships, part-time roles, or work experience.' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, hint: 'Academic, personal, or freelance projects.' },
  { key: 'skills', label: 'Skills', icon: Wrench, hint: 'Technical and soft skills.' },
  { key: 'certifications', label: 'Certifications', icon: Award, hint: "Courses or certifications you've completed." },
  { key: 'achievements', label: 'Achievements', icon: Trophy, hint: 'Awards, competitions, recognitions.' },
  { key: 'extracurricular', label: 'Extracurricular', icon: Users, hint: 'Clubs, societies, volunteering, leadership roles.' },
  { key: 'languages', label: 'Languages', icon: LanguagesIcon, hint: 'Languages you can work in.' },
];

const DEFAULT_ANSWERS = {
  summary: { strengths: '', goal: '' },
  education: { institution: '', cgpa: '', period: '' },
  experience: [],
  projects: [],
  skills: '',
  certifications: [],
  achievements: [],
  extracurricular: [],
  languages: '',
};

function RepeatableEntries({ items, onChange, fields, addLabel }) {
  function update(idx, key, value) {
    const next = items.slice();
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  }
  function add() {
    onChange([...items, {}]);
  }
  function remove(idx) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border border-gray-100 rounded-lg p-3 relative bg-gray-50/40">
          <button type="button" onClick={() => remove(idx)} className="absolute top-2.5 right-2.5 text-gray-400 hover:text-urgent-500">
            <X className="h-4 w-4" />
          </button>
          <div className="grid sm:grid-cols-2 gap-2.5 pr-6">
            {fields.map((f) =>
              f.type === 'textarea' ? (
                <textarea
                  key={f.key}
                  placeholder={f.placeholder}
                  rows={2}
                  value={item[f.key] || ''}
                  onChange={(e) => update(idx, f.key, e.target.value)}
                  className="sm:col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              ) : (
                <input
                  key={f.key}
                  placeholder={f.placeholder}
                  value={item[f.key] || ''}
                  onChange={(e) => update(idx, f.key, e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              )
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs font-semibold text-brand-600 flex items-center gap-1">
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
      {!items.length && <p className="text-xs text-gray-400">Nothing added yet — click above to add your first entry.</p>}
    </div>
  );
}

function SectionCard({ meta, children }) {
  const Icon = meta.icon;
  return (
    <div className="card rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon className="h-4 w-4 text-brand-600" />
        <h3 className="font-semibold text-navy-950">{meta.label}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">{meta.hint}</p>
      {children}
    </div>
  );
}

function CVPreview({ user, targetRole, sections, cv }) {
  const titleFor = Object.fromEntries(SECTION_META.map((s) => [s.key, s.label]));

  return (
    <div id="cv-print-area" className="bg-white rounded-xl border border-gray-100 p-8 max-w-2xl mx-auto print:border-0 print:shadow-none print:p-0">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-navy-950">{user?.full_name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {[user?.program, user?.semester, user?.section].filter(Boolean).join(' \u00b7 ')}
          {targetRole ? ` \u2014 aiming for ${targetRole}` : ''}
        </p>
      </div>

      <div className="space-y-5">
        {sections.map((key) => {
          const data = cv?.[key];
          if (!data || (Array.isArray(data) && !data.length)) return null;

          return (
            <div key={key}>
              <h2 className="text-xs font-bold uppercase tracking-wide text-brand-600 border-b border-gray-100 pb-1 mb-2">
                {titleFor[key]}
              </h2>

              {key === 'summary' && <p className="text-sm text-gray-700 leading-relaxed">{data}</p>}

              {(key === 'skills' || key === 'languages') && (
                <div className="flex flex-wrap gap-1.5">
                  {data.map((s, i) => (
                    <span key={i} className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-md">{s}</span>
                  ))}
                </div>
              )}

              {key === 'education' && data.map((item, i) => (
                <div key={i} className="text-sm mb-1.5">
                  <p className="font-semibold text-navy-950">
                    {item.institution} {item.period ? <span className="font-normal text-gray-400">— {item.period}</span> : null}
                  </p>
                  {item.detail && <p className="text-gray-600">{item.detail}</p>}
                </div>
              ))}

              {(key === 'experience' || key === 'projects') && data.map((item, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <p className="text-sm font-semibold text-navy-950">
                    {item.title}{item.org ? ` — ${item.org}` : ''}
                    {item.period && <span className="font-normal text-gray-400 ml-1">({item.period})</span>}
                  </p>
                  {item.detail && <p className="text-xs text-gray-500 mb-1">{item.detail}</p>}
                  {Array.isArray(item.bullets) && item.bullets.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                      {item.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                    </ul>
                  )}
                </div>
              ))}

              {key === 'certifications' && data.map((item, i) => (
                <p key={i} className="text-sm text-gray-700 mb-1">
                  <span className="font-semibold text-navy-950">{item.name}</span>
                  {item.issuer ? ` — ${item.issuer}` : ''}{item.date ? ` (${item.date})` : ''}
                </p>
              ))}

              {(key === 'achievements' || key === 'extracurricular') && data.map((item, i) => (
                <p key={i} className="text-sm text-gray-700 mb-1.5">
                  <span className="font-semibold text-navy-950">{item.title}</span>
                  {item.detail ? ` — ${item.detail}` : ''}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CVBuilderPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState(['summary', 'education', 'skills']);
  const [targetRole, setTargetRole] = useState('');
  const [tone, setTone] = useState('professional');
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS);
  const [cv, setCV] = useState(null);
  const [generatedBy, setGeneratedBy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    api.getCV()
      .then((profile) => {
        if (!profile) return;
        setSections((prev) => (profile.sections?.length ? profile.sections : prev));
        setTargetRole(profile.target_role || '');
        setTone(profile.tone || 'professional');
        setAnswers({ ...DEFAULT_ANSWERS, ...(profile.answers || {}) });
        if (profile.generated_cv) {
          setCV(profile.generated_cv);
          setGeneratedBy(profile.generated_by);
          setEditing(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleSection(key) {
    setSections((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function updateAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function generate() {
    if (!sections.length) {
      setError('Pick at least one section first.');
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const profile = await api.generateCV({ target_role: targetRole, tone, sections, answers });
      setCV(profile.generated_cv);
      setGeneratedBy(profile.generated_by);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Something went wrong generating your CV.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-20 text-center">Loading CV Builder...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5 print:max-w-full">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cv-print-area, #cv-print-area * { visibility: visible; }
          #cv-print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div className="print:hidden flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" /> CV Builder
          </h1>
          <p className="text-sm text-gray-500 mt-1">Answer a few questions and let AI turn them into a polished, personal CV.</p>
        </div>
        {cv && !editing && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditing(true)} className="text-xs font-semibold rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-1.5 hover:border-brand-200">
              <Pencil className="h-3.5 w-3.5" /> Edit Answers
            </button>
            <button onClick={() => window.print()} className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 flex items-center gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-5 print:hidden">
          <div className="card rounded-xl p-5">
            <h2 className="font-semibold text-navy-950 mb-1">1. Which sections do you want?</h2>
            <p className="text-xs text-gray-400 mb-4">Toggle sections on or off — your CV only includes what you pick, so every student's CV can look different.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SECTION_META.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSection(key)}
                  className={`flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border transition ${
                    sections.includes(key) ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 text-gray-600 hover:border-brand-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="card rounded-xl p-5">
            <h2 className="font-semibold text-navy-950 mb-4">2. A little context</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Target role / industry (optional)</label>
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Marketing Analyst, Investment Banking"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="professional">Professional</option>
                  <option value="concise">Concise / to the point</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="academic">Academic</option>
                </select>
              </div>
            </div>
          </div>

          <h2 className="font-semibold text-navy-950 px-1">3. Tell us about each section</h2>

          {sections.includes('summary') && (
            <SectionCard meta={SECTION_META[0]}>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">What are your key strengths?</label>
                  <input value={answers.summary.strengths} onChange={(e) => updateAnswer('summary', { ...answers.summary, strengths: e.target.value })} placeholder="e.g. data analysis, public speaking, problem-solving" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">What's your career goal right now?</label>
                  <input value={answers.summary.goal} onChange={(e) => updateAnswer('summary', { ...answers.summary, goal: e.target.value })} placeholder="e.g. Looking for a summer internship in finance" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>
            </SectionCard>
          )}

          {sections.includes('education') && (
            <SectionCard meta={SECTION_META[1]}>
              <div className="grid sm:grid-cols-3 gap-3">
                <input value={answers.education.institution} onChange={(e) => updateAnswer('education', { ...answers.education, institution: e.target.value })} placeholder="Institution" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <input value={answers.education.cgpa} onChange={(e) => updateAnswer('education', { ...answers.education, cgpa: e.target.value })} placeholder="CGPA / % (optional)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <input value={answers.education.period} onChange={(e) => updateAnswer('education', { ...answers.education, period: e.target.value })} placeholder="Years, e.g. 2023–2026" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
            </SectionCard>
          )}

          {sections.includes('experience') && (
            <SectionCard meta={SECTION_META[2]}>
              <RepeatableEntries
                items={answers.experience}
                onChange={(v) => updateAnswer('experience', v)}
                addLabel="Add experience"
                fields={[
                  { key: 'title', placeholder: 'Role title' },
                  { key: 'org', placeholder: 'Company / organization' },
                  { key: 'period', placeholder: 'Duration (e.g. Jun–Aug 2025)' },
                  { key: 'description', placeholder: 'What did you do? One point per line — AI will turn these into polished bullets.', type: 'textarea' },
                ]}
              />
            </SectionCard>
          )}

          {sections.includes('projects') && (
            <SectionCard meta={SECTION_META[3]}>
              <RepeatableEntries
                items={answers.projects}
                onChange={(v) => updateAnswer('projects', v)}
                addLabel="Add project"
                fields={[
                  { key: 'title', placeholder: 'Project title' },
                  { key: 'tools', placeholder: 'Tools / tech used' },
                  { key: 'description', placeholder: 'What was it about? What did you build or achieve?', type: 'textarea' },
                ]}
              />
            </SectionCard>
          )}

          {sections.includes('skills') && (
            <SectionCard meta={SECTION_META[4]}>
              <input value={answers.skills} onChange={(e) => updateAnswer('skills', e.target.value)} placeholder="Comma-separated, e.g. Excel, Python, Public Speaking, Teamwork" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </SectionCard>
          )}

          {sections.includes('certifications') && (
            <SectionCard meta={SECTION_META[5]}>
              <RepeatableEntries
                items={answers.certifications}
                onChange={(v) => updateAnswer('certifications', v)}
                addLabel="Add certification"
                fields={[
                  { key: 'name', placeholder: 'Certification name' },
                  { key: 'issuer', placeholder: 'Issued by' },
                  { key: 'date', placeholder: 'Date (optional)' },
                ]}
              />
            </SectionCard>
          )}

          {sections.includes('achievements') && (
            <SectionCard meta={SECTION_META[6]}>
              <RepeatableEntries
                items={answers.achievements}
                onChange={(v) => updateAnswer('achievements', v)}
                addLabel="Add achievement"
                fields={[
                  { key: 'title', placeholder: 'Achievement' },
                  { key: 'description', placeholder: 'Brief detail (optional)' },
                ]}
              />
            </SectionCard>
          )}

          {sections.includes('extracurricular') && (
            <SectionCard meta={SECTION_META[7]}>
              <RepeatableEntries
                items={answers.extracurricular}
                onChange={(v) => updateAnswer('extracurricular', v)}
                addLabel="Add activity"
                fields={[
                  { key: 'title', placeholder: 'Activity / role' },
                  { key: 'description', placeholder: 'Brief detail (optional)' },
                ]}
              />
            </SectionCard>
          )}

          {sections.includes('languages') && (
            <SectionCard meta={SECTION_META[8]}>
              <input value={answers.languages} onChange={(e) => updateAnswer('languages', e.target.value)} placeholder="Comma-separated, e.g. English, Hindi, Kannada" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </SectionCard>
          )}

          {error && <p className="text-xs text-urgent-600 px-1">{error}</p>}

          <button
            onClick={generate}
            disabled={generating}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold py-3 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Generating your CV...' : cv ? 'Regenerate My CV with AI' : 'Generate My CV with AI'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {generatedBy === 'template' && (
            <p className="text-xs text-duesoon-600 bg-duesoon-50 rounded-lg px-3 py-2 print:hidden">
              This was formatted directly from your answers (no AI key configured on the server yet), so it's a bit more literal than a full AI rewrite would be. Ask your admin to add an <code>ANTHROPIC_API_KEY</code> for AI-polished wording.
            </p>
          )}
          <CVPreview user={user} targetRole={targetRole} sections={sections} cv={cv} />
          <div className="flex justify-center gap-2 print:hidden">
            <button onClick={() => setEditing(true)} className="text-xs font-semibold rounded-lg border border-gray-200 px-4 py-2 flex items-center gap-1.5 hover:border-brand-200">
              <RefreshCw className="h-3.5 w-3.5" /> Edit &amp; Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
