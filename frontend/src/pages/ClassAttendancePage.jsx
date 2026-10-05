import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Calendar, ChevronLeft, Users, CheckCircle2, XCircle, AlertTriangle, BarChart2, RefreshCw, Clock } from 'lucide-react';

const STATUSES = ['present', 'absent', 'late', 'cl'];
const STATUS_COLORS = {
  present: 'bg-green-600 text-white',
  absent: 'bg-red-500 text-white',
  late: 'bg-amber-500 text-white',
  cl: 'bg-blue-500 text-white',
};
const STATUS_IDLE = 'bg-white text-gray-500 hover:bg-gray-50';

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClassAttendancePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [klass, setKlass] = useState(null);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState('mark'); // 'mark' | 'sessions' | 'stats'
  const [stats, setStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [existingSession, setExistingSession] = useState(false);

  const loadRoster = useCallback(async () => {
    const roster = await api.classRoster(id);
    setKlass(roster.class);
    setStudents(roster.students);
  }, [id]);

  const loadAttendance = useCallback(async () => {
    const rows = await api.classAttendance(id, date).catch(() => []);
    const rec = {};
    let hasExisting = false;
    for (const row of rows) {
      rec[row.class_student_id] = row.status || 'present';
      if (row.status) hasExisting = true;
    }
    setRecords(rec);
    setExistingSession(hasExisting);
  }, [id, date]);

  const loadSessions = useCallback(async () => {
    const rows = await api.classSessions(id).catch(() => []);
    setSessions(rows);
  }, [id]);

  useEffect(() => { loadRoster(); loadSessions(); }, [loadRoster, loadSessions]);
  useEffect(() => { loadAttendance(); setSaved(false); }, [loadAttendance]);

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, cl: 0, unmarked: 0 };
    for (const student of students) {
      const s = records[student.id];
      if (!s) counts.unmarked++;
      else counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [records, students]);

  function markAll(status) {
    const next = {};
    for (const s of students) next[s.id] = status;
    setRecords(next);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        date,
        records: students.map((s) => ({
          class_student_id: s.id,
          status: records[s.id] || 'present',
        })),
      };
      await api.saveAttendance(id, payload);
      setSaved(true);
      setExistingSession(true);
      loadSessions();
    } finally {
      setSaving(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const rows = await api.classStats(id);
      setStats(rows);
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'stats') loadStats();
  }, [tab]);

  if (!klass) {
    return <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/classes')} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-navy-950">{klass.subject_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {klass.program} · Sem {klass.semester?.replace('Sem ', '') || '—'} · Section {klass.section}
            {klass.attendance_type ? ` · ${klass.attendance_type}` : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['mark', 'Mark Attendance'], ['sessions', 'Sessions'], ['stats', 'Student Stats']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-white shadow text-navy-950' : 'text-gray-500 hover:text-navy-950'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── MARK ATTENDANCE TAB ── */}
      {tab === 'mark' && (
        <>
          {/* Date picker + actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm border-none outline-none bg-transparent"
              />
            </div>
            {existingSession && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Session already recorded — saving will update existing records
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <button onClick={() => markAll('present')} className="text-xs px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 font-medium">
                All Present
              </button>
              <button onClick={() => markAll('absent')} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-medium">
                All Absent
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2"
              >
                {saving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Saving…</> : saved ? <><CheckCircle2 className="h-3.5 w-3.5" />Saved</> : 'Save Attendance'}
              </button>
            </div>
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Present', value: summary.present, color: 'text-green-600' },
              { label: 'Absent', value: summary.absent, color: 'text-red-500' },
              { label: 'Late', value: summary.late, color: 'text-amber-500' },
              { label: 'CL', value: summary.cl, color: 'text-blue-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 uppercase font-semibold">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Roster table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Roll No</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((student) => (
                  <tr key={student.id} className={records[student.id] === 'absent' ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{student.roll_no}</td>
                    <td className="px-5 py-3 font-medium text-navy-950">{student.full_name}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-center">
                        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                          {STATUSES.map((status) => (
                            <button
                              key={status}
                              onClick={() => setRecords((prev) => ({ ...prev, [student.id]: status }))}
                              className={`px-3 py-1.5 text-xs font-medium capitalize transition ${records[student.id] === status ? STATUS_COLORS[status] : STATUS_IDLE}`}
                            >
                              {status === 'cl' ? 'CL' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── SESSIONS TAB ── */}
      {tab === 'sessions' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-200" />
              No attendance sessions recorded yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Present</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Absent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">%</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => {
                  const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
                  return (
                    <tr key={s.attendance_date} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-navy-950">{formatDate(s.attendance_date)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{s.total}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-semibold">{s.present}</td>
                      <td className="px-4 py-3 text-center text-red-500 font-semibold">{s.absent}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={pct < 75 ? 'text-red-600 font-bold' : 'text-green-600 font-semibold'}>{pct}%</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => { setDate(s.attendance_date); setTab('mark'); }}
                          className="text-xs text-brand-600 hover:underline font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {tab === 'stats' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {statsLoading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Loading stats…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Roll No</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Conducted</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Present</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Absent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.map((s) => {
                  const low = s.attendance_pct != null && s.attendance_pct < 75;
                  return (
                    <tr key={s.roll_no} className={low ? 'bg-red-50/40' : 'hover:bg-gray-50/50'}>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{s.roll_no}</td>
                      <td className="px-5 py-3 font-medium text-navy-950 flex items-center gap-1.5">
                        {s.full_name}
                        {low && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{s.conducted}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-semibold">{s.present}</td>
                      <td className="px-4 py-3 text-center text-red-500 font-semibold">{s.absent}</td>
                      <td className="px-4 py-3 text-center">
                        {s.attendance_pct != null ? (
                          <span className={low ? 'text-red-600 font-bold' : 'text-green-600 font-semibold'}>
                            {Number(s.attendance_pct).toFixed(2)}%
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
