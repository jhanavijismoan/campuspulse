import { useEffect, useState } from 'react';
import { CalendarDays, Building2, Users, Eye, EyeOff, Plus, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function Badge({ published }) {
  return published
    ? <span className="text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Published</span>
    : <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>;
}

// ── My Duties tab ─────────────────────────────────────────────────────────────

function MyDutiesTab() {
  const [duties, setDuties] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.seatingMyDuties()
      .then(setDuties)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-6 text-center">Loading duties…</div>;
  if (error) return <div className="text-sm text-red-500 py-6 text-center">{error}</div>;
  if (!duties?.length) {
    return (
      <div className="text-center py-10">
        <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No invigilation duties assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {duties.map((d) => (
        <div key={d.id} className="card p-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-navy-950 text-sm">{d.session_title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{d.hall_name} · {d.duty_role.replace(/_/g, ' ')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(d.exam_date)} · {d.start_time} – {d.end_time}</p>
          </div>
          <Badge published={d.published} />
        </div>
      ))}
    </div>
  );
}

// ── Session row with expand ───────────────────────────────────────────────────

function SessionRow({ session, onPublish, onUnpublish }) {
  const [expanded, setExpanded] = useState(false);
  const [allocations, setAllocations] = useState(null);
  const [duties, setDuties] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function toggle() {
    if (!expanded && !allocations) {
      try {
        const [a, d] = await Promise.all([
          api.seatingAllocations(session.id),
          api.seatingDuties(session.id),
        ]);
        setAllocations(a);
        setDuties(d);
      } catch (err) {
        setError(err.message);
      }
    }
    setExpanded((v) => !v);
  }

  async function handlePublish() {
    setBusy(true);
    try { await onPublish(session.id); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleUnpublish() {
    setBusy(true);
    try { await onUnpublish(session.id); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-navy-950 text-sm">{session.title}</p>
            <Badge published={session.published} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {fmtDate(session.exam_date)} · {session.start_time} – {session.end_time}
            {session.program ? ` · ${session.program}` : ''}
            {session.semester ? ` Sem ${session.semester}` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {session.total_seats} seat(s) · {session.total_duties} duty assignment(s)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {session.published ? (
            <button
              onClick={handleUnpublish}
              disabled={busy}
              className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              <EyeOff className="h-3.5 w-3.5" /> Unpublish
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={busy}
              className="flex items-center gap-1 text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5" /> Publish
            </button>
          )}
          <button onClick={toggle} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 px-4 pb-2">{error}</p>}

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          {/* Seat allocations table */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Seat Allocations ({allocations?.length || 0})</p>
            {allocations?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-1.5 pr-3 font-medium">Student</th>
                      <th className="pb-1.5 pr-3 font-medium">Roll No</th>
                      <th className="pb-1.5 pr-3 font-medium">Hall</th>
                      <th className="pb-1.5 pr-3 font-medium">Row</th>
                      <th className="pb-1.5 font-medium">Seat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a) => (
                      <tr key={a.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-1.5 pr-3 text-navy-950">{a.full_name}</td>
                        <td className="py-1.5 pr-3 text-gray-500">{a.roll_no || '—'}</td>
                        <td className="py-1.5 pr-3 text-gray-500">{a.hall_name}</td>
                        <td className="py-1.5 pr-3 text-gray-500">{a.row_number}</td>
                        <td className="py-1.5 text-gray-500">{a.seat_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No seats allocated yet.</p>
            )}
          </div>

          {/* Duties */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Invigilation Duties ({duties?.length || 0})</p>
            {duties?.length ? (
              <div className="space-y-1">
                {duties.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium">{d.admin_name}</span>
                    <span className="text-gray-400">·</span>
                    <span>{d.hall_name}</span>
                    <span className="text-gray-400">·</span>
                    <span className="capitalize">{d.duty_role.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No duties assigned yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV Import modal ──────────────────────────────────────────────────────────

function CsvImportModal({ sessions, onClose }) {
  const [sessionId, setSessionId] = useState('');
  const [csvText, setCsvText] = useState('student_email,hall_name,row_number,seat_number\n');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleImport() {
    if (!sessionId) return;
    const lines = csvText.trim().split('\n').slice(1); // skip header
    const rows = lines.map((line) => {
      const [student_email, hall_name, row_number, seat_number] = line.split(',').map((s) => s.trim());
      return { student_email, hall_name, row_number: parseInt(row_number), seat_number: parseInt(seat_number) };
    }).filter((r) => r.student_email);

    setBusy(true);
    try {
      const res = await api.seatingImportCsv(parseInt(sessionId), rows);
      setResult(res);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-navy-950 mb-4">Import Seats from CSV</h3>

        <label className="block text-xs font-medium text-gray-600 mb-1">Exam Session</label>
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select session…</option>
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>

        <label className="block text-xs font-medium text-gray-600 mb-1">CSV Data</label>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={8}
          className="w-full text-xs font-mono rounded-lg border border-gray-200 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
        <p className="text-[10px] text-gray-400 mb-3">Format: student_email, hall_name, row_number, seat_number (one per line after the header)</p>

        {result && (
          <div className={`text-xs rounded-lg px-3 py-2 mb-3 ${result.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
            {result.error
              ? result.error
              : `Imported ${result.inserted} seat(s).${result.errors?.length ? ` ${result.errors.length} error(s).` : ''}`}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 transition">Cancel</button>
          <button
            onClick={handleImport}
            disabled={busy || !sessionId}
            className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {busy ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Session modal ──────────────────────────────────────────────────────

function CreateSessionModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', exam_date: '', start_time: '10:00', end_time: '12:00', program: '', semester: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, semester: form.semester ? parseInt(form.semester) : null };
      const session = await api.seatingCreateSession(payload);
      onCreated(session);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-navy-950 mb-4">New Exam Session</h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. CIA 1 — BBA Semester 3"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input required type="date" value={form.exam_date} onChange={(e) => set('exam_date', e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Program</label>
              <input value={form.program} onChange={(e) => set('program', e.target.value)}
                placeholder="e.g. BBA"
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start *</label>
              <input required type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End *</label>
              <input required type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
              <input type="number" min="1" max="8" value={form.semester} onChange={(e) => set('semester', e.target.value)}
                placeholder="3"
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 transition">Cancel</button>
            <button type="submit" disabled={busy}
              className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
              {busy ? 'Creating…' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Manage Exams tab ──────────────────────────────────────────────────────────

function ManageExamsTab() {
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    api.seatingSessions()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handlePublish(sessionId) {
    await api.seatingPublish(sessionId);
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, published: true } : s));
  }

  async function handleUnpublish(sessionId) {
    await api.seatingUnpublish(sessionId);
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, published: false } : s));
  }

  if (loading) return <div className="text-sm text-gray-400 py-6 text-center">Loading sessions…</div>;
  if (error) return <div className="text-sm text-red-500 py-6 text-center">{error}</div>;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">{sessions?.length || 0} exam session(s)</p>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition">
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition">
            <Plus className="h-3.5 w-3.5" /> New Session
          </button>
        </div>
      </div>

      {!sessions?.length ? (
        <div className="text-center py-10">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No exam sessions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onPublish={handlePublish} onUnpublish={handleUnpublish} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={(s) => setSessions((prev) => [{ ...s, total_seats: 0, total_duties: 0 }, ...prev])}
        />
      )}
      {showImport && sessions && (
        <CsvImportModal sessions={sessions} onClose={() => setShowImport(false)} />
      )}
    </>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

const TABS = [
  { key: 'duties', label: 'My Duties', Icon: Users },
  { key: 'manage', label: 'Manage Exams', Icon: CalendarDays },
];

export default function AdminSeating() {
  const [tab, setTab] = useState('duties');

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition ${
              tab === key ? 'bg-white text-navy-950 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'duties' && <MyDutiesTab />}
      {tab === 'manage' && <ManageExamsTab />}
    </div>
  );
}
