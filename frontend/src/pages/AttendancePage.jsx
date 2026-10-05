import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AlertTriangle, CheckCircle2, BookOpen } from 'lucide-react';

function Ring({ pct }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const dash = pct != null ? (pct / 100) * circumference : 0;
  const color = pct == null ? '#e5e7eb' : pct < 75 ? '#ef4444' : pct < 85 ? '#f59e0b' : '#22c55e';

  return (
    <svg width="72" height="72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
      {pct != null && (
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      )}
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
        {pct != null ? `${pct}%` : '—'}
      </text>
    </svg>
  );
}

function SubjectCard({ subject }) {
  const { subject_name, total_classes, present, absent, attendance_pct } = subject;
  const low = attendance_pct != null && attendance_pct < 75;
  const borderColor = low ? 'border-l-red-500' : attendance_pct >= 85 ? 'border-l-green-500' : 'border-l-amber-400';

  return (
    <div className={`bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 border-l-4 ${borderColor}`}>
      <Ring pct={attendance_pct} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-navy-950 text-sm">{subject_name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {present}/{total_classes} classes attended
          {absent > 0 && ` · ${absent} absent`}
        </p>
        {low && (
          <div className="flex items-center gap-1 mt-1 text-xs text-red-600 font-medium">
            <AlertTriangle className="h-3 w-3" />
            Below 75% — attendance shortage
          </div>
        )}
      </div>
      {!low && attendance_pct >= 85 && (
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      )}
    </div>
  );
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

  const withData = subjects.filter((s) => s.total_classes > 0);
  const totalPresent = withData.reduce((s, x) => s + x.present, 0);
  const totalClasses = withData.reduce((s, x) => s + x.total_classes, 0);
  const overallPct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : null;
  const atRisk = withData.filter((s) => s.attendance_pct != null && s.attendance_pct < 75);

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">My Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Subject-wise attendance for the current semester</p>
      </div>

      {/* Overall summary */}
      {overallPct != null && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-5">
          <Ring pct={overallPct} />
          <div>
            <p className="font-semibold text-navy-950">Overall Attendance</p>
            <p className="text-sm text-gray-500">{totalPresent} of {totalClasses} total classes</p>
            {atRisk.length > 0 && (
              <p className="text-xs text-red-600 font-medium mt-1">
                {atRisk.length} subject{atRisk.length > 1 ? 's' : ''} below 75%
              </p>
            )}
          </div>
        </div>
      )}

      {/* Per-subject */}
      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No attendance data available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects
            .sort((a, b) => (a.attendance_pct ?? 100) - (b.attendance_pct ?? 100))
            .map((s) => (
              <SubjectCard key={s.class_id} subject={s} />
            ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Minimum required: 75% per subject. Contact your teacher for any discrepancies.
      </p>
    </div>
  );
}
