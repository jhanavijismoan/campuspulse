import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BookCheck, TrendingUp, Award } from 'lucide-react';

function markColor(score, max) {
  const pct = (score / max) * 100;
  if (pct >= 88) return 'text-green-600 bg-green-50';
  if (pct >= 72) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function groupBySubject(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.subject_name]) map[r.subject_name] = { subject_name: r.subject_name, max_marks: r.max_marks };
    map[r.subject_name][`cia${r.cia_number}`] = parseFloat(r.marks_obtained);
  }
  return Object.values(map);
}

export default function CIAMarksPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCIAMarks()
      .then((data) => setRows(groupBySubject(data)))
      .catch(() => setError('Could not load CIA marks. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-navy-950 mb-4">CIA Marks</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-navy-950">CIA Marks</h1>
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <BookCheck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No CIA marks have been published yet.</p>
          <p className="text-xs text-gray-300 mt-1">Check back after your first CIA.</p>
        </div>
      </div>
    );
  }

  const cia1Scores = rows.filter((r) => r.cia1 != null).map((r) => r.cia1);
  const completedSubjects = cia1Scores.length;
  const cia1Avg = completedSubjects > 0 ? Math.round(cia1Scores.reduce((a, b) => a + b, 0) / completedSubjects) : 0;
  const topScore = completedSubjects > 0 ? Math.max(...cia1Scores) : 0;
  const maxPerCIA = rows[0]?.max_marks ?? 25;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">CIA Marks</h1>
        <p className="text-sm text-gray-500 mt-1">Continuous Internal Assessment</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'CIA 1 Average', value: `${cia1Avg}/${maxPerCIA}`, icon: BookCheck, color: 'text-brand-600' },
          { label: 'Subjects Done', value: `${completedSubjects}/${rows.length}`, icon: TrendingUp, color: 'text-amber-600' },
          { label: 'Top Score', value: `${topScore}`, icon: Award, color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
            <p className="text-lg font-bold text-navy-950">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Marks table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px] px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Subject</span>
          <span className="text-center">CIA 1</span>
          <span className="text-center">CIA 2</span>
        </div>

        {rows.map((row) => (
          <div key={row.subject_name} className="grid grid-cols-[1fr_80px_80px] px-5 py-3.5 border-b border-gray-50 last:border-0 items-center">
            <div>
              <p className="text-sm font-medium text-navy-950">{row.subject_name}</p>
              <p className="text-xs text-gray-400">Max {row.max_marks}</p>
            </div>
            <div className="text-center">
              {row.cia1 != null ? (
                <span className={`inline-block text-sm font-semibold px-2 py-0.5 rounded ${markColor(row.cia1, row.max_marks)}`}>
                  {row.cia1}
                </span>
              ) : (
                <span className="text-xs text-gray-300">—</span>
              )}
            </div>
            <div className="text-center">
              {row.cia2 != null ? (
                <span className={`inline-block text-sm font-semibold px-2 py-0.5 rounded ${markColor(row.cia2, row.max_marks)}`}>
                  {row.cia2}
                </span>
              ) : (
                <span className="text-xs text-gray-300">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Only published marks are shown. Contact your teacher for any discrepancies.
      </p>
    </div>
  );
}
