import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AlertTriangle, BookOpen, TrendingDown } from 'lucide-react';

function PctBadge({ pct }) {
  if (pct == null) return <span className="text-gray-300">—</span>;
  const cls = pct < 75
    ? 'text-red-600 font-bold'
    : pct < 85
    ? 'text-amber-600 font-semibold'
    : 'text-green-600 font-semibold';
  return <span className={cls}>{pct.toFixed(2)}%</span>;
}

export default function AttendancePage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.studentAttendance()
      .then(setSubjects)
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));
  }, []);

  const withData = subjects.filter((s) => s.conducted > 0);
  const totalConducted = withData.reduce((a, s) => a + s.conducted, 0);
  const totalPresent = withData.reduce((a, s) => a + s.present, 0);
  const totalAbsent = withData.reduce((a, s) => a + s.absent, 0);
  const overallPct = totalConducted > 0
    ? Math.round((totalPresent / totalConducted) * 10000) / 100
    : null;
  const atRisk = withData.filter((s) => s.pct_without_cl != null && s.pct_without_cl < 75);

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">My Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Subject-wise attendance for the current semester</p>
      </div>

      {/* At-risk warnings */}
      {atRisk.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Attendance shortage detected</p>
            <p className="text-sm text-red-600 mt-0.5">
              {atRisk.map((s) => s.subject_name).join(', ')} — below 75% minimum requirement.
            </p>
          </div>
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No attendance data available yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sl No</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject Name</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendance Type</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Conducted</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Present</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Absent</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">% without CL</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">% with CL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subjects.map((s, idx) => {
                  const low = s.pct_without_cl != null && s.pct_without_cl < 75;
                  return (
                    <tr key={s.class_id} className={low ? 'bg-red-50/40' : 'hover:bg-gray-50/50'}>
                      <td className="px-5 py-4 text-gray-500">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-navy-950">{s.subject_name}</span>
                          {low && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-gray-600">{s.attendance_type || 'Theory'}</td>
                      <td className="px-4 py-4 text-center font-semibold text-teal-600">{s.conducted}</td>
                      <td className="px-4 py-4 text-center font-semibold text-teal-600">{s.present}</td>
                      <td className="px-4 py-4 text-center font-semibold text-red-500">{s.absent}</td>
                      <td className="px-4 py-4 text-center">
                        <PctBadge pct={s.pct_without_cl} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <PctBadge pct={s.pct_with_cl} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              {withData.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td colSpan={3} className="px-5 py-4 text-right text-gray-700 text-xs uppercase tracking-wide">Total</td>
                    <td className="px-4 py-4 text-center text-teal-700">{totalConducted}</td>
                    <td className="px-4 py-4 text-center text-teal-700">{totalPresent}</td>
                    <td className="px-4 py-4 text-center text-red-600">{totalAbsent}</td>
                    <td className="px-4 py-4 text-center">
                      <PctBadge pct={overallPct} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <PctBadge pct={overallPct} />
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Minimum required attendance: 75% per subject. Contact your teacher for any discrepancies.
      </p>
    </div>
  );
}
