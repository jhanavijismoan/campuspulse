import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Sparkles, Plus, X, Loader2, Printer, RefreshCw, Pencil, FileText,
  GraduationCap, Briefcase, FolderKanban, Wrench, Award, Trophy, Users,
  Languages as LanguagesIcon, CheckCircle2, Save, Eye, EyeOff, Upload,
  ChevronDown, ChevronUp, Star, BookOpen, User as UserIcon, ArrowUp, ArrowDown,
  AlertCircle, Info,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Section metadata ──────────────────────────────────────────────────────────
const SECTION_META = [
  { key: 'summary',        label: 'Professional Summary', icon: FileText,         hint: 'A short intro paragraph at the top of your CV.' },
  { key: 'education',      label: 'Education',             icon: GraduationCap,   hint: 'Your degree, institution, and academic details.' },
  { key: 'experience',     label: 'Experience',            icon: Briefcase,        hint: 'Internships, part-time roles, or work experience.' },
  { key: 'projects',       label: 'Projects',              icon: FolderKanban,     hint: 'Academic, personal, or freelance projects.' },
  { key: 'skills',         label: 'Skills',                icon: Wrench,           hint: 'Technical skills, tools, and soft skills.' },
  { key: 'certifications', label: 'Certifications',        icon: Award,            hint: "Courses or certifications you've completed." },
  { key: 'achievements',   label: 'Achievements',          icon: Trophy,           hint: 'Awards, competitions, recognitions.' },
  { key: 'extracurricular',label: 'Extracurricular',       icon: Users,            hint: 'Clubs, societies, volunteering, leadership.' },
  { key: 'languages',      label: 'Languages',             icon: LanguagesIcon,    hint: 'Languages you can work in.' },
  { key: 'interests',      label: 'Interests',             icon: Star,             hint: 'Optional — hobbies and interests.' },
];

const SECTION_MAP = Object.fromEntries(SECTION_META.map((s) => [s.key, s]));

const DEFAULT_PERSONAL = {
  name: '', email: '', phone: '', location: '',
  linkedin: '', github: '', portfolio: '',
};

const DEFAULT_ANSWERS = {
  summary: { strengths: '', goal: '' },
  education: [],
  experience: [],
  projects: [],
  skills: '',
  certifications: [],
  achievements: [],
  extracurricular: [],
  languages: '',
  interests: '',
};

// ── Small helpers ─────────────────────────────────────────────────────────────
function Label({ children, optional }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {children}
      {optional && <span className="font-normal text-gray-400 ml-1">(optional)</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 bg-white ${className}`} />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 bg-white resize-y" />
  );
}

// ── Repeatable entry list ─────────────────────────────────────────────────────
function EntryList({ items, onChange, renderItem, emptyLabel, addLabel }) {
  function add() { onChange([...items, {}]); }
  function remove(i) { onChange(items.filter((_, idx) => idx !== i)); }
  function update(i, patch) { onChange(items.map((item, idx) => idx === i ? { ...item, ...patch } : item)); }
  function move(i, dir) {
    const next = items.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border border-gray-100 rounded-xl p-4 bg-gray-50/40 relative group">
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            {idx > 0 && (
              <button type="button" onClick={() => move(idx, -1)} className="p-1 rounded hover:bg-gray-200 text-gray-400" title="Move up">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            )}
            {idx < items.length - 1 && (
              <button type="button" onClick={() => move(idx, 1)} className="p-1 rounded hover:bg-gray-200 text-gray-400" title="Move down">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" onClick={() => remove(idx)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500" title="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {renderItem(item, (patch) => update(idx, patch))}
        </div>
      ))}
      {!items.length && <p className="text-xs text-gray-400 italic">{emptyLabel || 'No entries yet.'}</p>}
      <button type="button" onClick={add}
        className="text-xs font-semibold text-brand-600 flex items-center gap-1 hover:text-brand-700">
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
}

// ── Section toggle grid ───────────────────────────────────────────────────────
function SectionToggle({ activeKeys, onChange }) {
  function toggle(key) {
    onChange(activeKeys.includes(key) ? activeKeys.filter((k) => k !== key) : [...activeKeys, key]);
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {SECTION_META.map(({ key, label, icon: Icon }) => (
        <button key={key} type="button" onClick={() => toggle(key)}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition text-left ${
            activeKeys.includes(key)
              ? 'bg-brand-600 border-brand-600 text-white'
              : 'border-gray-200 text-gray-600 hover:border-brand-200 hover:bg-brand-50/40'
          }`}>
          <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
        </button>
      ))}
    </div>
  );
}

// ── Section form cards ────────────────────────────────────────────────────────
function SummaryForm({ data, onChange }) {
  return (
    <div className="space-y-3">
      <div><Label>Key strengths</Label>
        <Input value={data.strengths || ''} onChange={(v) => onChange({ ...data, strengths: v })} placeholder="e.g. data analysis, public speaking, problem-solving" /></div>
      <div><Label>Career goal right now</Label>
        <Input value={data.goal || ''} onChange={(v) => onChange({ ...data, goal: v })} placeholder="e.g. Looking for a summer internship in finance" /></div>
    </div>
  );
}

function EducationForm({ items, onChange }) {
  return (
    <EntryList items={items} onChange={onChange} addLabel="Add education"
      emptyLabel="Add your degree, school, or ongoing education."
      renderItem={(item, update) => (
        <div className="grid sm:grid-cols-2 gap-3 pr-12">
          <div className="sm:col-span-2"><Label>Institution</Label>
            <Input value={item.institution || ''} onChange={(v) => update({ institution: v })} placeholder="e.g. Mount Carmel University" /></div>
          <div><Label>Degree</Label>
            <Input value={item.degree || ''} onChange={(v) => update({ degree: v })} placeholder="e.g. BBA" /></div>
          <div><Label optional>Course / Specialisation</Label>
            <Input value={item.course || ''} onChange={(v) => update({ course: v })} placeholder="e.g. Finance & Marketing" /></div>
          <div><Label>Start date</Label>
            <Input value={item.start_date || ''} onChange={(v) => update({ start_date: v })} placeholder="e.g. 2023" /></div>
          <div><Label>End date</Label>
            <Input value={item.end_date || ''} onChange={(v) => update({ end_date: v })} placeholder="e.g. 2026 (or Present)" /></div>
          <div><Label optional>CGPA / Grade</Label>
            <Input value={item.cgpa || ''} onChange={(v) => update({ cgpa: v })} placeholder="e.g. 8.5 / 10" /></div>
        </div>
      )}
    />
  );
}

function ExperienceForm({ items, onChange }) {
  return (
    <EntryList items={items} onChange={onChange} addLabel="Add experience"
      emptyLabel="Add internships, part-time roles, or work experience."
      renderItem={(item, update) => (
        <div className="grid sm:grid-cols-2 gap-3 pr-12">
          <div><Label>Role / Title</Label>
            <Input value={item.title || ''} onChange={(v) => update({ title: v })} placeholder="e.g. Marketing Intern" /></div>
          <div><Label>Company / Organisation</Label>
            <Input value={item.company || ''} onChange={(v) => update({ company: v })} placeholder="e.g. Deloitte India" /></div>
          <div><Label>Start date</Label>
            <Input value={item.start_date || ''} onChange={(v) => update({ start_date: v })} placeholder="e.g. Jun 2025" /></div>
          <div><Label>End date</Label>
            <Input value={item.end_date || ''} onChange={(v) => update({ end_date: v })} placeholder="e.g. Aug 2025 (or Present)" /></div>
          <div className="sm:col-span-2"><Label>Description</Label>
            <Textarea rows={2} value={item.description || ''} onChange={(v) => update({ description: v })}
              placeholder="What did you do? One point per line. AI will turn these into polished bullet points." /></div>
          <div className="sm:col-span-2"><Label optional>Key achievements</Label>
            <Textarea rows={2} value={item.achievements || ''} onChange={(v) => update({ achievements: v })}
              placeholder="e.g. Increased social media engagement by 30%" /></div>
        </div>
      )}
    />
  );
}

function ProjectsForm({ items, onChange }) {
  return (
    <EntryList items={items} onChange={onChange} addLabel="Add project"
      emptyLabel="Add academic, personal, or freelance projects."
      renderItem={(item, update) => (
        <div className="grid sm:grid-cols-2 gap-3 pr-12">
          <div><Label>Project name</Label>
            <Input value={item.title || ''} onChange={(v) => update({ title: v })} placeholder="e.g. Campus Event App" /></div>
          <div><Label optional>Technologies used</Label>
            <Input value={item.technologies || ''} onChange={(v) => update({ technologies: v })} placeholder="e.g. React, Node.js, PostgreSQL" /></div>
          <div className="sm:col-span-2"><Label>Description</Label>
            <Textarea rows={2} value={item.description || ''} onChange={(v) => update({ description: v })}
              placeholder="What was it? What did you build or achieve?" /></div>
        </div>
      )}
    />
  );
}

function SkillsForm({ data, onChange }) {
  return (
    <div className="space-y-3">
      <div><Label>Technical skills</Label>
        <Textarea rows={2} value={typeof data === 'string' ? data : (Array.isArray(data) ? data.join(', ') : '')}
          onChange={onChange}
          placeholder="Comma-separated: MS Excel, Python, SQL, Tableau, PowerPoint, Tally…" /></div>
      <p className="text-xs text-gray-400">Separate with commas. List your strongest skills first — these are used for internship matching.</p>
    </div>
  );
}

function CertificationsForm({ items, onChange }) {
  return (
    <EntryList items={items} onChange={onChange} addLabel="Add certification"
      emptyLabel="Add online courses, professional certifications, etc."
      renderItem={(item, update) => (
        <div className="grid sm:grid-cols-3 gap-3 pr-12">
          <div className="sm:col-span-2"><Label>Certification name</Label>
            <Input value={item.name || ''} onChange={(v) => update({ name: v })} placeholder="e.g. Google Data Analytics Certificate" /></div>
          <div><Label>Issued by</Label>
            <Input value={item.issuer || ''} onChange={(v) => update({ issuer: v })} placeholder="e.g. Coursera" /></div>
          <div><Label optional>Date</Label>
            <Input value={item.date || ''} onChange={(v) => update({ date: v })} placeholder="e.g. Mar 2025" /></div>
        </div>
      )}
    />
  );
}

function SimpleListForm({ items, onChange, addLabel, emptyLabel, placeholder1, placeholder2, field1 = 'title', field2 = 'detail' }) {
  return (
    <EntryList items={items} onChange={onChange} addLabel={addLabel} emptyLabel={emptyLabel}
      renderItem={(item, update) => (
        <div className="grid sm:grid-cols-2 gap-3 pr-12">
          <div><Input value={item[field1] || ''} onChange={(v) => update({ [field1]: v })} placeholder={placeholder1} /></div>
          <div><Input value={item[field2] || ''} onChange={(v) => update({ [field2]: v })} placeholder={placeholder2} /></div>
        </div>
      )}
    />
  );
}

function CommaListForm({ data, onChange, placeholder }) {
  return (
    <Input value={typeof data === 'string' ? data : (Array.isArray(data) ? data.join(', ') : '')}
      onChange={onChange} placeholder={placeholder} />
  );
}

// ── CV Preview ────────────────────────────────────────────────────────────────
function CVPreview({ personalInfo, targetRole, sections, cv, user }) {
  const pi = personalInfo || {};
  const name = pi.name || user?.full_name || 'Your Name';
  const contact = [pi.email || user?.email, pi.phone, pi.location].filter(Boolean).join(' · ');
  const links = [pi.linkedin, pi.github, pi.portfolio].filter(Boolean);

  return (
    <div id="cv-print-area" className="bg-white rounded-xl border border-gray-100 p-8 max-w-2xl mx-auto text-gray-800 print:border-0 print:shadow-none print:p-0 print:max-w-full">
      {/* Header */}
      <div className="mb-5 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">{name}</h1>
        {targetRole && <p className="text-sm text-brand-600 font-medium mt-0.5">{targetRole}</p>}
        {contact && <p className="text-xs text-gray-500 mt-1">{contact}</p>}
        {links.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5 break-all">{links.join(' · ')}</p>
        )}
      </div>

      <div className="space-y-5">
        {sections.map((key) => {
          const data = cv?.[key];
          if (!data && key !== 'summary') return null;
          if (Array.isArray(data) && !data.length) return null;
          if (!data) return null;

          const meta = SECTION_MAP[key];
          return (
            <div key={key}>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-brand-600 border-b border-gray-100 pb-1 mb-2.5">
                {meta?.label || key}
              </h2>

              {key === 'summary' && (
                <p className="text-sm text-gray-700 leading-relaxed">{typeof data === 'string' ? data : JSON.stringify(data)}</p>
              )}

              {(key === 'skills' || key === 'languages' || key === 'interests') && (
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(data) ? data : String(data).split(',').map((s) => s.trim()).filter(Boolean)).map((s, i) => (
                    <span key={i} className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-md border border-brand-100">{s}</span>
                  ))}
                </div>
              )}

              {key === 'education' && Array.isArray(data) && data.map((item, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-navy-950">{item.institution}</p>
                    <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">{item.start_date}{item.end_date ? ` – ${item.end_date}` : ''}</p>
                  </div>
                  <p className="text-sm text-gray-600">{[item.degree, item.course].filter(Boolean).join(', ')}{item.cgpa ? ` · CGPA: ${item.cgpa}` : ''}</p>
                </div>
              ))}

              {key === 'experience' && Array.isArray(data) && data.map((item, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-navy-950">{item.title}{item.company ? ` — ${item.company}` : ''}</p>
                    <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">{item.start_date}{item.end_date ? ` – ${item.end_date}` : ''}</p>
                  </div>
                  {Array.isArray(item.bullets) && item.bullets.filter(Boolean).length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-0.5">
                      {item.bullets.filter(Boolean).map((b, bi) => <li key={bi}>{b}</li>)}
                    </ul>
                  ) : item.description ? (
                    <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{item.description}</p>
                  ) : null}
                  {item.achievements && !item.bullets?.length && (
                    <p className="text-sm text-gray-600 mt-0.5 italic">{item.achievements}</p>
                  )}
                </div>
              ))}

              {key === 'projects' && Array.isArray(data) && data.map((item, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <p className="text-sm font-semibold text-navy-950">{item.title}</p>
                  {item.technologies && <p className="text-xs text-gray-400 mt-0.5">Technologies: {item.technologies}</p>}
                  {Array.isArray(item.bullets) && item.bullets.filter(Boolean).length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-0.5">
                      {item.bullets.filter(Boolean).map((b, bi) => <li key={bi}>{b}</li>)}
                    </ul>
                  ) : item.description ? (
                    <p className="text-sm text-gray-700 mt-0.5">{item.description}</p>
                  ) : null}
                </div>
              ))}

              {key === 'certifications' && Array.isArray(data) && data.map((item, i) => (
                <p key={i} className="text-sm text-gray-700 mb-1">
                  <span className="font-semibold text-navy-950">{item.name}</span>
                  {item.issuer ? ` — ${item.issuer}` : ''}
                  {item.date ? <span className="text-gray-400"> ({item.date})</span> : null}
                </p>
              ))}

              {(key === 'achievements' || key === 'extracurricular') && Array.isArray(data) && data.map((item, i) => (
                <p key={i} className="text-sm text-gray-700 mb-1">
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

// ── Active CV Selector card ───────────────────────────────────────────────────
function ActiveCVSelector({ activeSource, hasBuilt, hasUploaded, uploadedName, onActivate, activating }) {
  return (
    <div className="card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-brand-600" />
        <p className="font-semibold text-navy-950 text-sm">Active CV for Internship Matching</p>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        The active CV is used to calculate your match scores on internship opportunities. Only one can be active at a time.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Built CV option */}
        <div className={`rounded-xl border-2 p-3 transition ${activeSource === 'built' ? 'border-brand-500 bg-brand-50/60' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-navy-950 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" /> Built CV
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{hasBuilt ? 'Your structured CV from the builder' : 'Not created yet'}</p>
            </div>
            {activeSource === 'built' && <span className="shrink-0 px-1.5 py-0.5 bg-brand-100 text-brand-700 text-[10px] font-bold rounded uppercase">Active</span>}
          </div>
          {hasBuilt && activeSource !== 'built' && (
            <button onClick={() => onActivate('built')} disabled={activating}
              className="mt-2 w-full text-xs font-semibold py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50">
              {activating === 'built' ? 'Activating…' : 'Use for Matching'}
            </button>
          )}
        </div>

        {/* Uploaded CV option */}
        <div className={`rounded-xl border-2 p-3 transition ${activeSource === 'uploaded' ? 'border-brand-500 bg-brand-50/60' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-navy-950 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-gray-500" /> Uploaded CV
              </p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{hasUploaded ? uploadedName || 'Uploaded file' : 'No file uploaded'}</p>
            </div>
            {activeSource === 'uploaded' && <span className="shrink-0 px-1.5 py-0.5 bg-brand-100 text-brand-700 text-[10px] font-bold rounded uppercase">Active</span>}
          </div>
          {hasUploaded && activeSource !== 'uploaded' && (
            <button onClick={() => onActivate('uploaded')} disabled={activating}
              className="mt-2 w-full text-xs font-semibold py-1.5 rounded-lg bg-gray-700 hover:bg-gray-800 text-white disabled:opacity-50">
              {activating === 'uploaded' ? 'Activating…' : 'Use for Matching'}
            </button>
          )}
          {!hasUploaded && (
            <p className="text-xs text-gray-400 italic mt-2">Upload a CV file on the Internships page.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CVBuilderPage() {
  const { user } = useAuth();

  const [sections, setSections] = useState(['summary', 'education', 'experience', 'skills']);
  const [personalInfo, setPersonalInfo] = useState({ ...DEFAULT_PERSONAL });
  const [targetRole, setTargetRole] = useState('');
  const [tone, setTone] = useState('professional');
  const [answers, setAnswers] = useState({ ...DEFAULT_ANSWERS });
  const [structuredCV, setStructuredCV] = useState(null);   // generated/polished CV
  const [generatedBy, setGeneratedBy] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [view, setView] = useState('edit');  // 'edit' | 'preview'
  const [activeSection, setActiveSection] = useState('personal');  // which editor panel is expanded

  const [uploadedCV, setUploadedCV] = useState(null);
  const [activeSource, setActiveSource] = useState(null);
  const [activating, setActivating] = useState(null);

  // Load on mount
  useEffect(() => {
    api.getCV()
      .then((data) => {
        if (!data) return;
        const { profile, uploaded_cv, active_cv_source } = data;
        setUploadedCV(uploaded_cv || null);
        setActiveSource(active_cv_source || null);
        if (profile) {
          if (profile.sections?.length) setSections(profile.sections);
          if (profile.target_role) setTargetRole(profile.target_role);
          if (profile.tone) setTone(profile.tone);
          if (profile.personal_info && Object.keys(profile.personal_info).length) {
            setPersonalInfo({ ...DEFAULT_PERSONAL, ...profile.personal_info });
          } else if (user) {
            setPersonalInfo((p) => ({ ...p, name: user.full_name || '', email: user.email || '' }));
          }
          if (profile.answers && Object.keys(profile.answers).length) {
            setAnswers({ ...DEFAULT_ANSWERS, ...profile.answers });
          }
          if (profile.structured_cv) {
            setStructuredCV(profile.structured_cv);
            setGeneratedBy(profile.generated_by || 'saved');
          }
        } else if (user) {
          setPersonalInfo((p) => ({ ...p, name: user.full_name || '', email: user.email || '' }));
        }
      })
      .catch(() => {
        if (user) setPersonalInfo((p) => ({ ...p, name: user.full_name || '', email: user.email || '' }));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const currentCV = structuredCV || answers;

  async function handleSave() {
    setSaving(true); setSaved(false); setError('');
    try {
      await api.saveCV({
        personal_info: personalInfo, sections, answers,
        structured_cv: structuredCV, target_role: targetRole, tone,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!sections.length) { setError('Pick at least one section.'); return; }
    setError(''); setGenerating(true);
    try {
      const profile = await api.generateCV({
        personal_info: personalInfo, target_role: targetRole, tone, sections, answers,
      });
      setStructuredCV(profile.structured_cv || profile.generated_cv);
      setGeneratedBy(profile.generated_by);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      setView('preview');
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleActivate(source) {
    setActivating(source); setError('');
    try {
      const result = await api.activateCV(source);
      setActiveSource(result.active_cv_source || source);
    } catch (err) {
      setError(err.message || 'Failed to switch active CV');
    } finally {
      setActivating(null);
    }
  }

  function updateAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (structuredCV) setStructuredCV((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <div className="text-sm text-gray-400 py-20 text-center">Loading CV Builder…</div>;

  const hasBuilt = !!structuredCV || sections.some((k) => {
    const a = answers[k];
    return a && (typeof a === 'string' ? a.trim() : Array.isArray(a) ? a.length > 0 : Object.values(a).some(Boolean));
  });
  const hasUploaded = !!uploadedCV;

  return (
    <div className="max-w-5xl mx-auto space-y-5 print:max-w-full">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cv-print-area, #cv-print-area * { visibility: visible; }
          #cv-print-area { position: absolute; top: 0; left: 0; width: 100%; padding: 24px; }
        }
      `}</style>

      {/* Header */}
      <div className="print:hidden flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" /> CV Builder
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Build a structured CV, preview it, generate a PDF, and use it for internship matching.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setView(view === 'edit' ? 'preview' : 'edit')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">
            {view === 'edit' ? <><Eye className="h-4 w-4" /> Preview</> : <><Pencil className="h-4 w-4" /> Edit</>}
          </button>
          {view === 'preview' && (
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold">
              <Printer className="h-4 w-4" /> Download PDF
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition
              ${saved ? 'bg-green-600 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60'}`}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : saved ? <><CheckCircle2 className="h-4 w-4" /> Saved</>
              : <><Save className="h-4 w-4" /> Save Draft</>}
          </button>
        </div>
      </div>

      {/* Active CV selector */}
      <div className="print:hidden">
        <ActiveCVSelector
          activeSource={activeSource} hasBuilt={hasBuilt} hasUploaded={hasUploaded}
          uploadedName={uploadedCV?.original_filename}
          onActivate={handleActivate} activating={activating}
        />
      </div>

      {error && (
        <div className="print:hidden flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── EDIT VIEW ──────────────────────────────────────────── */}
      {view === 'edit' && (
        <div className="print:hidden space-y-4">
          {/* Personal Info */}
          <CollapsibleSection title="Personal Information" icon={UserIcon} active={activeSection === 'personal'} onToggle={() => setActiveSection(activeSection === 'personal' ? null : 'personal')}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Full Name</Label>
                <Input value={personalInfo.name} onChange={(v) => setPersonalInfo((p) => ({ ...p, name: v }))} placeholder="Your full name" /></div>
              <div><Label>Email</Label>
                <Input value={personalInfo.email} onChange={(v) => setPersonalInfo((p) => ({ ...p, email: v }))} placeholder="your@email.com" type="email" /></div>
              <div><Label optional>Phone</Label>
                <Input value={personalInfo.phone} onChange={(v) => setPersonalInfo((p) => ({ ...p, phone: v }))} placeholder="+91 98765 43210" /></div>
              <div><Label optional>Location</Label>
                <Input value={personalInfo.location} onChange={(v) => setPersonalInfo((p) => ({ ...p, location: v }))} placeholder="Bengaluru, India" /></div>
              <div><Label optional>LinkedIn URL</Label>
                <Input value={personalInfo.linkedin} onChange={(v) => setPersonalInfo((p) => ({ ...p, linkedin: v }))} placeholder="linkedin.com/in/yourname" /></div>
              <div><Label optional>GitHub URL</Label>
                <Input value={personalInfo.github} onChange={(v) => setPersonalInfo((p) => ({ ...p, github: v }))} placeholder="github.com/yourname" /></div>
              <div className="sm:col-span-2"><Label optional>Portfolio / Website</Label>
                <Input value={personalInfo.portfolio} onChange={(v) => setPersonalInfo((p) => ({ ...p, portfolio: v }))} placeholder="https://yoursite.com" /></div>
            </div>
          </CollapsibleSection>

          {/* Context */}
          <CollapsibleSection title="CV Context" icon={Info} active={activeSection === 'context'} onToggle={() => setActiveSection(activeSection === 'context' ? null : 'context')}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label optional>Target role / industry</Label>
                <Input value={targetRole} onChange={setTargetRole} placeholder="e.g. Marketing Analyst, Finance Intern" /></div>
              <div>
                <Label>Writing tone</Label>
                <select value={tone} onChange={(e) => setTone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white">
                  {[['professional','Professional'],['concise','Concise / To the point'],['enthusiastic','Enthusiastic'],['academic','Academic']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
          </CollapsibleSection>

          {/* Section selection */}
          <CollapsibleSection title="Sections to Include" icon={BookOpen} active={activeSection === 'sections'} onToggle={() => setActiveSection(activeSection === 'sections' ? null : 'sections')}>
            <SectionToggle activeKeys={sections} onChange={setSections} />
          </CollapsibleSection>

          {/* Dynamic section forms */}
          {sections.includes('summary') && (
            <CollapsibleSection title="Professional Summary" icon={FileText} active={activeSection === 'summary'} onToggle={() => setActiveSection(activeSection === 'summary' ? null : 'summary')}>
              <SummaryForm data={answers.summary || {}} onChange={(v) => updateAnswer('summary', v)} />
            </CollapsibleSection>
          )}
          {sections.includes('education') && (
            <CollapsibleSection title="Education" icon={GraduationCap} active={activeSection === 'education'} onToggle={() => setActiveSection(activeSection === 'education' ? null : 'education')}>
              <EducationForm items={answers.education || []} onChange={(v) => updateAnswer('education', v)} />
            </CollapsibleSection>
          )}
          {sections.includes('experience') && (
            <CollapsibleSection title="Experience" icon={Briefcase} active={activeSection === 'experience'} onToggle={() => setActiveSection(activeSection === 'experience' ? null : 'experience')}>
              <ExperienceForm items={answers.experience || []} onChange={(v) => updateAnswer('experience', v)} />
            </CollapsibleSection>
          )}
          {sections.includes('projects') && (
            <CollapsibleSection title="Projects" icon={FolderKanban} active={activeSection === 'projects'} onToggle={() => setActiveSection(activeSection === 'projects' ? null : 'projects')}>
              <ProjectsForm items={answers.projects || []} onChange={(v) => updateAnswer('projects', v)} />
            </CollapsibleSection>
          )}
          {sections.includes('skills') && (
            <CollapsibleSection title="Skills" icon={Wrench} active={activeSection === 'skills'} onToggle={() => setActiveSection(activeSection === 'skills' ? null : 'skills')}>
              <SkillsForm data={answers.skills} onChange={(v) => updateAnswer('skills', v)} />
            </CollapsibleSection>
          )}
          {sections.includes('certifications') && (
            <CollapsibleSection title="Certifications" icon={Award} active={activeSection === 'certifications'} onToggle={() => setActiveSection(activeSection === 'certifications' ? null : 'certifications')}>
              <CertificationsForm items={answers.certifications || []} onChange={(v) => updateAnswer('certifications', v)} />
            </CollapsibleSection>
          )}
          {sections.includes('achievements') && (
            <CollapsibleSection title="Achievements" icon={Trophy} active={activeSection === 'achievements'} onToggle={() => setActiveSection(activeSection === 'achievements' ? null : 'achievements')}>
              <SimpleListForm items={answers.achievements || []} onChange={(v) => updateAnswer('achievements', v)}
                addLabel="Add achievement" emptyLabel="Add awards, competitions, recognitions."
                placeholder1="Achievement" placeholder2="Brief detail (optional)" />
            </CollapsibleSection>
          )}
          {sections.includes('extracurricular') && (
            <CollapsibleSection title="Extracurricular" icon={Users} active={activeSection === 'extracurricular'} onToggle={() => setActiveSection(activeSection === 'extracurricular' ? null : 'extracurricular')}>
              <SimpleListForm items={answers.extracurricular || []} onChange={(v) => updateAnswer('extracurricular', v)}
                addLabel="Add activity" emptyLabel="Add clubs, societies, volunteering, leadership."
                placeholder1="Activity / role" placeholder2="Brief detail (optional)" />
            </CollapsibleSection>
          )}
          {sections.includes('languages') && (
            <CollapsibleSection title="Languages" icon={LanguagesIcon} active={activeSection === 'languages'} onToggle={() => setActiveSection(activeSection === 'languages' ? null : 'languages')}>
              <CommaListForm data={answers.languages} onChange={(v) => updateAnswer('languages', v)}
                placeholder="e.g. English, Hindi, Kannada" />
            </CollapsibleSection>
          )}
          {sections.includes('interests') && (
            <CollapsibleSection title="Interests" icon={Star} active={activeSection === 'interests'} onToggle={() => setActiveSection(activeSection === 'interests' ? null : 'interests')}>
              <CommaListForm data={answers.interests} onChange={(v) => updateAnswer('interests', v)}
                placeholder="e.g. Photography, Competitive Programming, Hiking" />
            </CollapsibleSection>
          )}

          {/* AI Generate */}
          <div className="card rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-semibold text-navy-950 flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-600" /> Polish with AI</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {generatedBy === 'ai' ? 'AI has already polished your CV. Re-generate after making changes.' : 'Turn your rough notes into polished, resume-quality bullet points and descriptions.'}
                </p>
              </div>
              <button onClick={handleGenerate} disabled={generating}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold">
                {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Polishing…</> : <><Sparkles className="h-4 w-4" /> {generatedBy ? 'Re-generate' : 'Generate'}</>}
              </button>
            </div>
            {generatedBy === 'template' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                Generated using your answers directly (no AI key configured). Content is formatted but not AI-polished.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── PREVIEW VIEW ─────────────────────────────────────── */}
      {view === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 print:hidden">
            <p className="text-sm text-gray-500 flex-1">
              {structuredCV && generatedBy === 'ai' ? '✨ AI-polished version' : 'Live preview from your entries'} — click Download PDF to save.
            </p>
            <button onClick={() => setView('edit')} className="text-xs font-medium text-brand-600 flex items-center gap-1 hover:underline">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
          <CVPreview
            personalInfo={personalInfo} targetRole={targetRole} sections={sections}
            cv={structuredCV || buildPreviewCV(answers, sections)} user={user}
          />
        </div>
      )}
    </div>
  );
}

// Collapsible section wrapper
function CollapsibleSection({ title, icon: Icon, active, onToggle, children }) {
  return (
    <div className="card rounded-xl overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50/60 transition">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-brand-600 shrink-0" />
          <span className="font-semibold text-navy-950 text-sm">{title}</span>
        </div>
        {active ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {active && <div className="px-5 pb-5 pt-1 border-t border-gray-50">{children}</div>}
    </div>
  );
}

// Convert raw answers to preview-friendly format (without AI polishing)
function buildPreviewCV(answers, sections) {
  const cv = {};
  for (const key of sections) {
    const raw = answers[key];
    if (raw == null) continue;
    if (key === 'summary') {
      const bits = [];
      if (raw.strengths) bits.push(`Skilled in ${raw.strengths}.`);
      if (raw.goal) bits.push(raw.goal);
      cv.summary = bits.join(' ');
    } else if (key === 'skills' || key === 'languages' || key === 'interests') {
      cv[key] = typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : (Array.isArray(raw) ? raw : []);
    } else if (Array.isArray(raw)) {
      cv[key] = raw;
    } else {
      cv[key] = raw;
    }
  }
  return cv;
}
