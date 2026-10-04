import { useEffect, useRef, useState } from 'react';
import {
  Building2, Upload, FileText, ArrowLeft, MapPin, Clock, IndianRupee,
  CalendarClock, Sparkles, Trash2, Loader2, ChevronDown,
} from 'lucide-react';
import { api } from '../api/client';

const SORT_OPTIONS = [
  { value: 'match', label: 'Best Match' },
  { value: 'newest', label: 'Newest Posted' },
  { value: 'oldest', label: 'Oldest Posted' },
  { value: 'stipend_desc', label: 'Stipend: High to Low' },
  { value: 'stipend_asc', label: 'Stipend: Low to High' },
  { value: 'deadline_asc', label: 'Deadline: Soonest First' },
  { value: 'deadline_desc', label: 'Deadline: Latest First' },
];

const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const ms = new Date(dateStr) - new Date(new Date().toDateString());
  return Math.round(ms / 86400000);
}

function DeadlineBadge({ deadline }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  let className = 'bg-gray-100 text-gray-500';
  let text = `Closes ${new Date(deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
  if (days < 0) { className = 'bg-gray-100 text-gray-400'; text = 'Closed'; }
  else if (days === 0) { className = 'bg-urgent-50 text-urgent-600'; text = 'Closes today'; }
  else if (days <= 3) { className = 'bg-urgent-50 text-urgent-600'; text = `Closes in ${days}d`; }
  else if (days <= 7) { className = 'bg-duesoon-50 text-duesoon-600'; text = `Closes in ${days}d`; }
  return <span className={`text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap ${className}`}>{text}</span>;
}

function MatchBadge({ score }) {
  if (score === null || score === undefined) {
    return <p className="text-[11px] text-gray-400 text-right leading-snug w-16">Upload CV<br />for match %</p>;
  }
  const color = score >= 75 ? 'text-today-600' : score >= 50 ? 'text-duesoon-600' : 'text-gray-500';
  return (
    <div className="text-right shrink-0">
      <p className={`text-lg font-bold ${color}`}>{score}%</p>
      <p className="text-[10px] text-gray-400">Match</p>
    </div>
  );
}

function ResumeCard({ resume, onUploaded, onRemove }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      await api.uploadResume(file);
      onUploaded();
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="card rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0 text-brand-600">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          {resume ? (
            <>
              <p className="text-sm font-semibold text-navy-950 truncate">{resume.original_filename}</p>
              <p className="text-xs text-gray-400">
                Uploaded {new Date(resume.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} &middot; used to calculate your match %
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-navy-950">Upload your CV to see personalized match %</p>
              <p className="text-xs text-gray-400">PDF, DOCX, or TXT &middot; we read it to compare against each opportunity</p>
            </>
          )}
          {error && <p className="text-xs text-urgent-600 mt-1">{error}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFile} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-3 py-2 flex items-center gap-1.5"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Reading your CV...' : resume ? 'Replace CV' : 'Upload CV'}
        </button>
        {resume && (
          <button onClick={onRemove} title="Remove CV" className="text-gray-400 hover:text-urgent-500 p-2 rounded-lg hover:bg-gray-50">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function InternshipDetail({ internship, onClose, onApply }) {
  return (
    <div className="card rounded-xl p-6 max-w-2xl mx-auto">
      <button onClick={onClose} className="text-xs font-semibold text-gray-500 hover:text-navy-950 flex items-center gap-1.5 mb-5">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Opportunities
      </button>

      <div className="flex items-start gap-4 mb-5">
        <div className="h-14 w-14 rounded-xl bg-navy-900 flex items-center justify-center shrink-0">
          <Building2 className="h-7 w-7 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-navy-950">{internship.role_title}</h1>
          <p className="text-sm text-gray-500">{internship.company_name}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(internship.tags || []).map((t) => (
              <span key={t} className="text-[10px] bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">{t}</span>
            ))}
          </div>
        </div>
        <MatchBadge score={internship.match_score} />
      </div>

      {internship.match_reason && (
        <div className="bg-brand-50 rounded-lg p-3 flex gap-2 mb-5">
          <Sparkles className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-brand-700 mb-0.5">Why this match</p>
            <p className="text-xs text-brand-700/80 leading-snug">{internship.match_reason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-gray-100 rounded-lg p-3">
          <MapPin className="h-3.5 w-3.5 text-gray-400 mb-1" />
          <p className="text-xs font-semibold text-navy-950">{internship.location || 'Not specified'}</p>
          <p className="text-[10px] text-gray-400">{internship.work_mode}</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <IndianRupee className="h-3.5 w-3.5 text-gray-400 mb-1" />
          <p className="text-xs font-semibold text-navy-950">{internship.stipend_text || 'Not disclosed'}</p>
          <p className="text-[10px] text-gray-400">Stipend</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <Clock className="h-3.5 w-3.5 text-gray-400 mb-1" />
          <p className="text-xs font-semibold text-navy-950">{internship.duration || 'Not specified'}</p>
          <p className="text-[10px] text-gray-400">Duration</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <CalendarClock className="h-3.5 w-3.5 text-gray-400 mb-1" />
          <p className="text-xs font-semibold text-navy-950">
            {internship.application_deadline ? new Date(internship.application_deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Rolling'}
          </p>
          <p className="text-[10px] text-gray-400">Apply by</p>
        </div>
      </div>

      {internship.description && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-navy-950 mb-1.5">About the Role</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{internship.description}</p>
        </div>
      )}

      {internship.requirements && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-navy-950 mb-1.5">Requirements</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{internship.requirements}</p>
        </div>
      )}

      <button
        onClick={() => onApply(internship.id)}
        disabled={internship.application_status !== 'suggested'}
        className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3"
      >
        {internship.application_status === 'suggested' ? 'Apply Now' : 'Applied'}
      </button>
    </div>
  );
}

export default function InternshipsPage() {
  const [internships, setInternships] = useState([]);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('match');
  const [workMode, setWorkMode] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected] = useState(null);

  function load() {
    setLoading(true);
    const params = { sort };
    if (workMode) params.work_mode = workMode;
    if (showClosed) params.show_closed = 'true';
    Promise.all([api.internships(params), api.getResume().catch(() => null)])
      .then(([internshipRows, resumeRow]) => {
        setInternships(internshipRows);
        setResume(resumeRow);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [sort, workMode, showClosed]);

  async function handleApply(id) {
    try {
      await api.applyToInternship(id);
      load();
      setSelected((prev) => (prev ? { ...prev, application_status: 'applied' } : prev));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRemoveResume() {
    if (!confirm('Remove your uploaded CV? Match scores will reset until you upload a new one.')) return;
    await api.deleteResume();
    load();
  }

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto">
        <InternshipDetail internship={selected} onClose={() => setSelected(null)} onApply={handleApply} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">Internship Opportunities</h1>
        <p className="text-sm text-gray-500">Matched to your CV, skills, and program.</p>
      </div>

      <ResumeCard resume={resume} onUploaded={load} onRemove={handleRemoveResume} />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none text-xs font-semibold rounded-lg border border-gray-200 pl-3 pr-8 py-2 bg-white text-navy-950"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {WORK_MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => setWorkMode((prev) => (prev === mode ? '' : mode))}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border transition ${
              workMode === mode ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 text-gray-600 hover:border-brand-200'
            }`}
          >
            {mode}
          </button>
        ))}

        <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 ml-auto cursor-pointer">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          Show closed
        </label>
      </div>

      <div className="card p-5">
        {loading ? (
          <div className="text-sm text-gray-400 py-16 text-center">Loading...</div>
        ) : (
          <div className="space-y-4">
            {internships.map((i) => (
              <div key={i.id} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div className="h-10 w-10 rounded-lg bg-navy-900 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy-950">{i.company_name}</p>
                  <p className="text-xs text-gray-500">{i.role_title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {i.location} {i.work_mode ? `\u00b7 ${i.work_mode}` : ''}
                  </p>
                  {i.stipend_text && <p className="text-xs text-gray-500 mt-0.5">Stipend: {i.stipend_text}</p>}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {(i.tags || []).map((t) => (
                      <span key={t} className="text-[10px] bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">{t}</span>
                    ))}
                    <DeadlineBadge deadline={i.application_deadline} />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleApply(i.id)}
                      disabled={i.application_status !== 'suggested'}
                      className="text-xs font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-1.5"
                    >
                      {i.application_status === 'suggested' ? 'Apply Now' : 'Applied'}
                    </button>
                    <button
                      onClick={() => setSelected(i)}
                      className="text-xs font-medium border border-gray-200 hover:border-brand-200 text-navy-950 rounded-lg px-3 py-1.5"
                    >
                      View More
                    </button>
                  </div>
                </div>
                <MatchBadge score={i.match_score} />
              </div>
            ))}
            {!internships.length && <p className="text-xs text-gray-400 text-center py-8">No opportunities match these filters.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
