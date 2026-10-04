import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

const STATUSES = ['present', 'absent', 'late'];

export default function ClassAttendancePage() {
  const { id } = useParams();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [klass, setKlass] = useState(null);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const [roster, attendance] = await Promise.all([
      api.classRoster(id),
      api.classAttendance(id, date).catch(() => []),
    ]);
    setKlass(roster.class);
    setStudents(roster.students);
    const existing = {};
    for (const row of roster.students) existing[row.id] = 'present';
    for (const row of attendance) existing[row.class_student_id] = row.status;
    setRecords(existing);
  }

  useEffect(() => {
    load();
  }, [id, date]);

  const summary = useMemo(() => STATUSES.reduce((acc, status) => {
    acc[status] = Object.values(records).filter((value) => value === status).length;
    return acc;
  }, {}), [records]);

  async function save() {
    setSaving(true);
    await api.saveAttendance(id, {
      date,
      records: students.map((student) => ({ class_student_id: student.id, status: records[student.id] || 'present' })),
    });
    setSaving(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">{klass?.subject_name || 'Attendance'}</h1>
          <p className="text-sm text-gray-500 mt-1">{klass?.program} Section {klass?.section}</p>
        </div>
        <div className="flex gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <button onClick={save} disabled={saving} className="rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2">
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {STATUSES.map((status) => (
          <div key={status} className="card rounded-lg p-4">
            <p className="text-xs uppercase text-gray-400 font-semibold">{status}</p>
            <p className="text-2xl font-bold text-navy-950 capitalize">{summary[status] || 0}</p>
          </div>
        ))}
      </div>

      <div className="card rounded-lg p-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-gray-500">
            <tr className="border-b border-gray-100">
              <th className="py-3">Roll No</th>
              <th className="py-3">Student</th>
              <th className="py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-gray-50">
                <td className="py-3 text-gray-500">{student.roll_no}</td>
                <td className="py-3 font-semibold text-navy-950">{student.full_name}</td>
                <td className="py-3">
                  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => setRecords((prev) => ({ ...prev, [student.id]: status }))}
                        className={`px-3 py-1.5 text-xs capitalize ${records[student.id] === status ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
