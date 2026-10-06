import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardCheck, Plus, X } from 'lucide-react';
import { api } from '../api/client';

const PROGRAMS = ['BBA', 'BCom', 'BA', 'BSc', 'BCA', 'MBA', 'MCom'];
const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
const TYPES = ['Theory', 'Lab', 'Tutorial'];

const EMPTY_FORM = { subject_name: '', program: 'BBA', section: 'C', semester: 'Sem 3', attendance_type: 'Theory' };

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.classes().then(setClasses).catch(() => setClasses([])).finally(() => setLoading(false));
  }, []);

  const totalStudents = classes.reduce((sum, c) => sum + Number(c.student_count || 0), 0);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.subject_name.trim()) { setFormError('Subject name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const created = await api.createClass(form);
      setClasses((prev) => [...prev, created]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err.message || 'Failed to create class.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">My Classes</h1>
          <p className="text-sm text-gray-500 mt-1">All classes assigned to you this semester.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(''); }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="h-4 w-4" /> Add Class
        </button>
      </div>

      {/* Add Class Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-navy-950">New Class</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject Name *</label>
                <input
                  name="subject_name"
                  value={form.subject_name}
                  onChange={handleChange}
                  placeholder="e.g. Business Communication"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Program</label>
                  <select name="program" value={form.program} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                    {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                  <select name="section" value={form.section} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                    {SECTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
                  <select name="semester" value={form.semester} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                    {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select name="attendance_type" value={form.attendance_type} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-60">
                  {saving ? 'Creating…' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Classes', value: classes.length },
          { label: 'Total Students', value: totalStudents },
          { label: 'Programs', value: new Set(classes.map((c) => c.program)).size },
          { label: 'Sections', value: new Set(classes.map((c) => c.section)).size },
        ].map(({ label, value }) => (
          <div key={label} className="card rounded-lg p-4">
            <p className="text-2xl font-bold text-navy-950">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="card rounded-lg p-5">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading classes...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/classes/${c.id}/attendance`)}
                className="text-left border border-gray-100 rounded-xl p-4 hover:border-brand-200 hover:bg-brand-50/30 transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-950 truncate">{c.subject_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.program} · {c.semester || ''} · Section {c.section}
                      {c.attendance_type ? ` · ${c.attendance_type}` : ''}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0 text-brand-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-500">{c.student_count} students</span>
                  <span className="text-xs font-semibold text-brand-600 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Take Attendance
                  </span>
                </div>
              </button>
            ))}
            {!classes.length && (
              <div className="col-span-2 text-center py-12">
                <p className="text-sm text-gray-400 mb-3">No classes assigned yet.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-brand-600 text-sm font-medium hover:underline"
                >
                  + Add your first class
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
