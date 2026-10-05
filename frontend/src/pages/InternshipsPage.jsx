import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import {
  Briefcase, MapPin, Clock, Calendar, ExternalLink, Upload, X, FileText,
  ChevronDown, ChevronUp, Filter, Plus, Edit2, Eye, EyeOff, AlertTriangle,
  RotateCcw, Search, SlidersHorizontal, CheckCircle2, Trash2,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysLeft(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  return diff;
}
function stipendStr(amount, currency, text) {
  if (text) return text;
  if (amount) return `${currency || '₹'}${amount.toLocaleString('en-IN')}/mo`;
  return 'Unpaid / Not disclosed';
}

// ── CV Match Badge ────────────────────────────────────────────────────────────
function MatchBadge({ score, breakdown, reason }) {
  const [open, setOpen] = useState(false);
  if (score == null) return null;
  const color = score >= 75 ? 'bg-green-100 text-green-700 border-green-200'
    : score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}
      >
        CV Match: {score}%
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="absolute z-20 top-8 left-0 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs text-left" onClick={(e) => e.stopPropagation()}>
          <p className="font-semibold text-navy-950 mb-2">Match Breakdown</p>
          {breakdown && Object.entries({ skills: 'Skills', education: 'Education', experience: 'Experience', keywords: 'Keywords' }).map(([k, label]) => (
            breakdown[k] != null ? (
              <div key={k} className="flex items-center gap-2 mb-1.5">
                <span className="w-20 text-gray-500">{label}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${breakdown[k]}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-gray-600">{breakdown[k]}%</span>
              </div>
            ) : null
          ))}
          {reason && <p className="mt-2 text-gray-500 italic">{reason}</p>}
          <p className="mt-2 text-gray-400 text-[10px]">This score estimates your profile fit — it is not a hiring guarantee.</p>
        </div>
      )}
    </div>
  );
}

// ── Deadline Badge ────────────────────────────────────────────────────────────
function DeadlineBadge({ deadline }) {
  if (!deadline) return <span className="text-gray-400 text-xs">No deadline</span>;
  const d = daysLeft(deadline);
  const color = d < 0 ? 'text-gray-400'
    : d <= 3 ? 'text-red-600 font-bold'
    : d <= 7 ? 'text-amber-600 font-semibold'
    : 'text-gray-600';
  return <span className={`text-xs ${color}`}>{d < 0 ? `Closed ${fmt(deadline)}` : d === 0 ? 'Closes today' : `${d}d left · ${fmt(deadline)}`}</span>;
}

// ── CV Upload Card ────────────────────────────────────────────────────────────
function CVCard({ onResume }) {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadResume = useCallback(() => {
    api.getResume().then(setResume).catch(() => setResume(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadResume(); }, [loadResume]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowed.includes(file.type)) { setError('Only PDF, DOCX, or TXT files are allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5 MB.'); return; }
    setError('');
    setUploading(true);
    try {
      const r = await api.uploadResume(file);
      setResume(r);
      onResume?.();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete() {
    if (!confirm('Remove your CV?')) return;
    await api.deleteResume().catch(() => {});
    setResume(null);
    onResume?.();
  }

  if (loading) return null;

  return (
    <div className="card rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-950">{resume ? 'Your CV' : 'Upload CV for Match Scores'}</p>
            <p className="text-xs text-gray-500 truncate">
              {resume ? resume.original_filename : 'PDF, DOCX, or TXT · max 5 MB'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {resume && (
            <button onClick={handleDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
              <X className="h-4 w-4" />
            </button>
          )}
          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition
            ${uploading ? 'bg-gray-100 text-gray-400 pointer-events-none' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}>
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : resume ? 'Replace' : 'Upload'}
            <input type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {!resume && (
        <p className="text-xs text-gray-400 mt-2">
          Upload your CV to see how well your profile matches each opportunity. Match scores estimate profile fit and are not a guarantee of selection.
        </p>
      )}
    </div>
  );
}

// ── Internship Form (Admin) ───────────────────────────────────────────────────
const EMPTY_FORM = {
  company_name: '', role_title: '', location: '', work_mode: 'Hybrid',
  stipend_amount: '', stipend_currency: 'INR', stipend_text: '',
  about_company: '', description: '', job_description: '', job_requirements: '',
  required_skills: '', preferred_skills: '', eligibility: '', course: '', target_semester: '',
  application_url: '', duration: '', application_deadline: '', publish_date: '', published: false,
};

function InternshipForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(initial || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.company_name.trim() || !form.role_title.trim()) {
      setError('Company name and role title are required.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        stipend_amount: form.stipend_amount ? Number(form.stipend_amount) : null,
        required_skills: form.required_skills ? form.required_skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        preferred_skills: form.preferred_skills ? form.preferred_skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        tags: form.required_skills ? form.required_skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        application_deadline: form.application_deadline || null,
        publish_date: form.publish_date || null,
      };
      const saved = initial?.id
        ? await api.updateInternship(initial.id, payload)
        : await api.createInternship(payload);
      onSave(saved);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const field = (label, key, type = 'text', props = {}) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type} value={form[key]} onChange={(e) => set(key, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
        {...props}
      />
    </div>
  );
  const textarea = (label, key, rows = 3) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <textarea
        rows={rows} value={form[key]} onChange={(e) => set(key, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 resize-y"
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('Company Name *', 'company_name')}
        {field('Role / Title *', 'role_title')}
        {field('Location', 'location', 'text', { placeholder: 'e.g. Bengaluru, Remote' })}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Work Mode</label>
          <select value={form.work_mode} onChange={(e) => set('work_mode', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
            {['Remote', 'Hybrid', 'On-site'].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        {field('Stipend Amount (numeric)', 'stipend_amount', 'number', { placeholder: 'e.g. 15000', min: 0 })}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Currency</label>
          <select value={form.stipend_currency} onChange={(e) => set('stipend_currency', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
            {['INR', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {field('Stipend Display Text', 'stipend_text', 'text', { placeholder: 'e.g. ₹15,000/month' })}
        {field('Duration', 'duration', 'text', { placeholder: 'e.g. 2 months' })}
        {field('Publish Date', 'publish_date', 'date')}
        {field('Application Deadline', 'application_deadline', 'date')}
        {field('Application URL', 'application_url', 'url', { placeholder: 'https://' })}
        {field('Course', 'course', 'text', { placeholder: 'e.g. BBA, BCom' })}
        {field('Target Semester', 'target_semester', 'text', { placeholder: 'e.g. Sem 3' })}
      </div>

      {textarea('About Company', 'about_company', 2)}
      {textarea('Description / Overview', 'description', 3)}
      {textarea('Job Description', 'job_description', 3)}
      {textarea('Job Requirements', 'job_requirements', 3)}
      {textarea('Eligibility', 'eligibility', 2)}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Required Skills <span className="font-normal text-gray-400">(comma-separated)</span></label>
          <input type="text" value={form.required_skills} onChange={(e) => set('required_skills', e.target.value)}
            placeholder="e.g. MS Excel, Business Analysis, SQL"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Skills <span className="font-normal text-gray-400">(comma-separated)</span></label>
          <input type="text" value={form.preferred_skills} onChange={(e) => set('preferred_skills', e.target.value)}
            placeholder="e.g. Tableau, Project Management"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="published-check" checked={form.published} onChange={(e) => set('published', e.target.checked)} className="h-4 w-4 rounded" />
        <label htmlFor="published-check" className="text-sm text-gray-700">Publish immediately (visible to students)</label>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold">
          {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Create Internship'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Detail Modal (student) ────────────────────────────────────────────────────
function DetailModal({ internship: i, onClose, onApply }) {
  const [applying, setApplying] = useState(false);
  const applied = i.application_status === 'applied' || i.application_status === 'interviewing' || i.application_status === 'offered';
  const closed = i.application_deadline && daysLeft(i.application_deadline) < 0;

  async function doApply() {
    if (applying || applied || closed) return;
    setApplying(true);
    try { await onApply(i.id); } finally { setApplying(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-3 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-navy-950">{i.role_title}</h2>
            <p className="text-sm text-gray-500">{i.company_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 text-xs">
            {i.location && <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-gray-600"><MapPin className="h-3 w-3" />{i.location}</span>}
            {i.work_mode && <span className="px-2.5 py-1 bg-gray-100 rounded-full text-gray-600">{i.work_mode}</span>}
            {(i.stipend_amount || i.stipend_text) && <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-semibold">{stipendStr(i.stipend_amount, i.stipend_currency, i.stipend_text)}</span>}
            {i.duration && <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-gray-600"><Clock className="h-3 w-3" />{i.duration}</span>}
          </div>

          {/* Dates */}
          <div className="flex gap-6 text-sm">
            <div><p className="text-xs text-gray-400 mb-0.5">Published</p><p className="font-medium text-navy-950">{fmt(i.publish_date || i.created_at)}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Deadline</p><DeadlineBadge deadline={i.application_deadline} /></div>
          </div>

          {/* Match */}
          {i.match_score != null && (
            <div>
              <MatchBadge score={i.match_score} breakdown={i.match_breakdown} reason={i.match_reason} />
            </div>
          )}

          {i.about_company && <Section title="About Company" text={i.about_company} />}
          {i.description && <Section title="About the Internship" text={i.description} />}
          {i.job_description && <Section title="Job Description" text={i.job_description} />}
          {i.job_requirements && <Section title="Requirements" text={i.job_requirements} />}
          {i.eligibility && <Section title="Eligibility" text={i.eligibility} />}

          {(i.required_skills?.length > 0 || i.preferred_skills?.length > 0) && (
            <div>
              {i.required_skills?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Required Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {i.required_skills.map((s) => <span key={s} className="px-2.5 py-0.5 bg-brand-50 text-brand-700 rounded-full text-xs font-medium border border-brand-100">{s}</span>)}
                  </div>
                </div>
              )}
              {i.preferred_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Preferred Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {i.preferred_skills.map((s) => <span key={s} className="px-2.5 py-0.5 bg-gray-50 text-gray-600 rounded-full text-xs border border-gray-200">{s}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="flex gap-3 pt-2">
            {i.application_url && (
              <a href={i.application_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition">
                <ExternalLink className="h-4 w-4" /> Apply on Company Portal
              </a>
            )}
            <button
              onClick={doApply}
              disabled={applying || applied || closed || !i.published}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition
                ${applied ? 'bg-green-100 text-green-700 border border-green-200'
                  : closed ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-navy-950 hover:bg-navy-800 text-white'}`}
            >
              {applied ? <><CheckCircle2 className="h-4 w-4" /> Applied</> : applying ? 'Applying…' : closed ? 'Deadline Passed' : 'Mark as Applied'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, text }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{title}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

// ── Admin Card ────────────────────────────────────────────────────────────────
function AdminCard({ intern, onEdit, onPublish, onUnpublish, onTakedown, onRestore }) {
  const isLive = intern.published && !intern.taken_down;
  const isTakenDown = intern.taken_down;

  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm space-y-3 ${isTakenDown ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-navy-950">{intern.role_title}</p>
            {isLive && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Live</span>}
            {!intern.published && !isTakenDown && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase">Draft</span>}
            {isTakenDown && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">Taken Down</span>}
          </div>
          <p className="text-sm text-gray-500">{intern.company_name}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(intern)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-600" title="Edit">
            <Edit2 className="h-4 w-4" />
          </button>
          {!isTakenDown && isLive && (
            <button onClick={() => onUnpublish(intern.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600" title="Unpublish">
              <EyeOff className="h-4 w-4" />
            </button>
          )}
          {!isTakenDown && !intern.published && (
            <button onClick={() => onPublish(intern.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600" title="Publish">
              <Eye className="h-4 w-4" />
            </button>
          )}
          {!isTakenDown && (
            <button onClick={() => onTakedown(intern.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600" title="Take Down">
              <AlertTriangle className="h-4 w-4" />
            </button>
          )}
          {isTakenDown && (
            <button onClick={() => onRestore(intern.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600" title="Restore">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {intern.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{intern.location}</span>}
        {intern.work_mode && <span>{intern.work_mode}</span>}
        {(intern.stipend_amount || intern.stipend_text) && <span className="text-green-700 font-medium">{stipendStr(intern.stipend_amount, intern.stipend_currency, intern.stipend_text)}</span>}
        {intern.course && <span>{intern.course}</span>}
      </div>

      <div className="flex items-center justify-between text-xs">
        <DeadlineBadge deadline={intern.application_deadline} />
        {intern.applicant_count > 0 && (
          <span className="text-gray-500">{intern.applicant_count} application{intern.applicant_count !== '1' ? 's' : ''}</span>
        )}
      </div>
    </div>
  );
}

// ── Student Card ──────────────────────────────────────────────────────────────
function StudentCard({ intern, hasCV, onView, onApply }) {
  const applied = ['applied', 'interviewing', 'offered'].includes(intern.application_status);
  const closed = intern.application_deadline && daysLeft(intern.application_deadline) < 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3 hover:shadow-md transition cursor-pointer" onClick={() => onView(intern)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-navy-950">{intern.role_title}</p>
          <p className="text-sm text-gray-500 truncate">{intern.company_name}</p>
        </div>
        {applied && <span className="shrink-0 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">Applied</span>}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {intern.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{intern.location}</span>}
        {intern.work_mode && <span>{intern.work_mode}</span>}
        {(intern.stipend_amount || intern.stipend_text) && <span className="text-green-700 font-semibold">{stipendStr(intern.stipend_amount, intern.stipend_currency, intern.stipend_text)}</span>}
      </div>

      <div className="flex items-center justify-between">
        <DeadlineBadge deadline={intern.application_deadline} />
        {intern.match_score != null
          ? <MatchBadge score={intern.match_score} breakdown={intern.match_breakdown} reason={intern.match_reason} />
          : !hasCV
          ? <span className="text-xs text-gray-400 italic">Upload CV for match</span>
          : null
        }
      </div>

      <div className="flex gap-2 pt-1 border-t border-gray-50">
        <button onClick={(e) => { e.stopPropagation(); onView(intern); }}
          className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition">
          View Details
        </button>
        <button
          onClick={async (e) => { e.stopPropagation(); await onApply(intern.id); }}
          disabled={applied || closed}
          className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition
            ${applied ? 'bg-green-100 text-green-700 border border-green-200 cursor-default'
              : closed ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-brand-600 hover:bg-brand-700 text-white'}`}
        >
          {applied ? 'Applied' : closed ? 'Closed' : 'Apply'}
        </button>
      </div>
    </div>
  );
}

// ── Filters Panel ─────────────────────────────────────────────────────────────
function FiltersPanel({ filters, onChange, isAdmin }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <input type="text" placeholder="Company" value={filters.company || ''} onChange={(e) => onChange('company', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
      <input type="text" placeholder="Location" value={filters.location || ''} onChange={(e) => onChange('location', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
      <select value={filters.work_mode || ''} onChange={(e) => onChange('work_mode', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white">
        <option value="">All Work Modes</option>
        {['Remote', 'Hybrid', 'On-site'].map((m) => <option key={m}>{m}</option>)}
      </select>
      <input type="text" placeholder="Course (e.g. BBA)" value={filters.course || ''} onChange={(e) => onChange('course', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
      <input type="number" placeholder="Min Stipend (₹)" value={filters.stipend_min || ''} onChange={(e) => onChange('stipend_min', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
      <input type="number" placeholder="Max Stipend (₹)" value={filters.stipend_max || ''} onChange={(e) => onChange('stipend_max', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
      <input type="text" placeholder="Skills (comma-separated)" value={filters.skills || ''} onChange={(e) => onChange('skills', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 col-span-2" />
      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={filters.show_unpublished === 'true'} onChange={(e) => onChange('show_unpublished', e.target.checked ? 'true' : '')} />
          Show taken-down
        </label>
      )}
      {!isAdmin && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={filters.show_closed === 'true'} onChange={(e) => onChange('show_closed', e.target.checked ? 'true' : '')} />
          Show closed
        </label>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InternshipsPage() {
  const [user, setUser] = useState(null);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [formMode, setFormMode] = useState(null); // null | 'create' | { edit: internship }
  const [detail, setDetail] = useState(null);
  const [hasCV, setHasCV] = useState(false);

  useEffect(() => {
    api.me().then(setUser).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = { ...filters, sort: sort || (user.role === 'admin' ? 'newest' : 'match') };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const rows = await api.internships(params);
      setInternships(rows);
    } finally {
      setLoading(false);
    }
  }, [user, filters, sort]);

  useEffect(() => { load(); }, [load]);

  function setFilter(k, v) { setFilters((f) => ({ ...f, [k]: v })); }
  function clearFilters() { setFilters({}); }

  async function handleApply(id) {
    await api.applyToInternship(id);
    setInternships((prev) => prev.map((i) => i.id === id ? { ...i, application_status: 'applied' } : i));
    if (detail?.id === id) setDetail((d) => ({ ...d, application_status: 'applied' }));
  }

  async function handlePublish(id) {
    await api.publishInternship(id);
    setInternships((prev) => prev.map((i) => i.id === id ? { ...i, published: true, taken_down: false } : i));
  }
  async function handleUnpublish(id) {
    await api.unpublishInternship(id);
    setInternships((prev) => prev.map((i) => i.id === id ? { ...i, published: false } : i));
  }
  async function handleTakedown(id) {
    if (!confirm('Take down this internship? It will be hidden from students.')) return;
    await api.takedownInternship(id);
    setInternships((prev) => prev.map((i) => i.id === id ? { ...i, taken_down: true, published: false } : i));
  }
  async function handleRestore(id) {
    await api.restoreInternship(id);
    setInternships((prev) => prev.map((i) => i.id === id ? { ...i, taken_down: false } : i));
  }

  function handleSaved(saved) {
    if (formMode?.edit) {
      setInternships((prev) => prev.map((i) => i.id === saved.id ? { ...i, ...saved } : i));
    } else {
      setInternships((prev) => [saved, ...prev]);
    }
    setFormMode(null);
  }

  const isAdmin = user?.role === 'admin';
  const SORT_OPTIONS = isAdmin
    ? [['newest', 'Newest'], ['oldest', 'Oldest'], ['deadline_asc', 'Nearest Deadline'], ['stipend_desc', 'Highest Stipend'], ['stipend_asc', 'Lowest Stipend']]
    : [['match', 'Best Match'], ['newest', 'Newest'], ['deadline_asc', 'Nearest Deadline'], ['stipend_desc', 'Highest Stipend'], ['stipend_asc', 'Lowest Stipend']];

  if (formMode) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">{formMode === 'create' ? 'Add Internship' : 'Edit Internship'}</h1>
          <p className="text-sm text-gray-500 mt-1">{formMode === 'create' ? 'Fill in the details and publish when ready.' : 'Update the internship details.'}</p>
        </div>
        <div className="card rounded-xl p-6">
          <InternshipForm
            initial={formMode === 'create' ? null : {
              ...formMode.edit,
              required_skills: (formMode.edit.required_skills || []).join(', '),
              preferred_skills: (formMode.edit.preferred_skills || []).join(', '),
            }}
            onSave={handleSaved}
            onCancel={() => setFormMode(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">Internship Opportunities</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Manage internship listings for your students.' : 'Explore internships matched to your profile.'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setFormMode('create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition">
            <Plus className="h-4 w-4" /> Add Internship
          </button>
        )}
      </div>

      {/* CV Card (student only) */}
      {!isAdmin && <CVCard onResume={() => { setHasCV(true); load(); }} />}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowFilters((f) => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition
            ${showFilters ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {Object.values(filters).filter(Boolean).length > 0 && (
            <span className="bg-brand-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5">
              {Object.values(filters).filter(Boolean).length}
            </span>
          )}
        </button>
        {Object.values(filters).filter(Boolean).length > 0 && (
          <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">Sort:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30">
            {SORT_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card rounded-xl p-4">
          <FiltersPanel filters={filters} onChange={setFilter} isAdmin={isAdmin} />
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : internships.length === 0 ? (
        <div className="card rounded-2xl p-12 text-center">
          <Briefcase className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No internships found.</p>
          {isAdmin && <button onClick={() => setFormMode('create')} className="mt-3 text-sm text-brand-600 hover:underline font-medium">Add the first one</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isAdmin
            ? internships.map((i) => (
              <AdminCard key={i.id} intern={i}
                onEdit={(intern) => setFormMode({ edit: intern })}
                onPublish={handlePublish} onUnpublish={handleUnpublish}
                onTakedown={handleTakedown} onRestore={handleRestore}
              />
            ))
            : internships.map((i) => (
              <StudentCard key={i.id} intern={i} hasCV={hasCV}
                onView={setDetail} onApply={handleApply}
              />
            ))
          }
        </div>
      )}

      {/* Student detail modal */}
      {detail && <DetailModal internship={detail} onClose={() => setDetail(null)} onApply={handleApply} />}
    </div>
  );
}
