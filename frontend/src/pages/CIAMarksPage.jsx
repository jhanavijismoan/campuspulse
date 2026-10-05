import { BookCheck, TrendingUp, Award } from 'lucide-react';

// Demo CIA marks data (BBA Sem 3) — these are illustrative only
// Replace with live data once CIA marks table/API is implemented
const CIA_DATA = [
  { subject: 'Business Communication',   cia1: 23, cia2: null, maxPerCIA: 25, teacher: 'Dr. A. Cardoza' },
  { subject: 'Marketing Management',     cia1: 21, cia2: null, maxPerCIA: 25, teacher: 'Dr. A. Cardoza' },
  { subject: 'Corporate Accounting',     cia1: 19, cia2: null, maxPerCIA: 25, teacher: 'Dr. A. Cardoza' },
  { subject: 'English Language',         cia1: 22, cia2: null, maxPerCIA: 25, teacher: 'Dr. A. Cardoza' },
  { subject: 'Banking Law and Practice', cia1: 20, cia2: null, maxPerCIA: 25, teacher: 'Dr. A. Cardoza' },
];

function markColor(score, max) {
  const pct = (score / max) * 100;
  if (pct >= 88) return 'text-green-600 bg-green-50';
  if (pct >= 72) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

export default function CIAMarksPage() {
  const totalEarned = CIA_DATA.reduce((s, r) => s + (r.cia1 ?? 0) + (r.cia2 ?? 0), 0);
  const totalPossible = CIA_DATA.reduce((s, r) => s + r.maxPerCIA + (r.cia2 != null ? r.maxPerCIA : 0), 0);
  const completedSubjects = CIA_DATA.filter((r) => r.cia1 != null).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">CIA Marks</h1>
        <p className="text-sm text-gray-500 mt-1">Continuous Internal Assessment — Semester 3</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'CIA 1 Average', value: `${Math.round(CIA_DATA.reduce((s,r) => s + (r.cia1 ?? 0), 0) / completedSubjects)}/${CIA_DATA[0].maxPerCIA}`, icon: BookCheck, color: 'text-brand-600' },
          { label: 'Subjects Done', value: `${completedSubjects}/${CIA_DATA.length}`, icon: TrendingUp, color: 'text-amber-600' },
          { label: 'Top Score', value: `${Math.max(...CIA_DATA.map(r => r.cia1 ?? 0))}`, icon: Award, color: 'text-green-600' },
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

        {CIA_DATA.map((row) => (
          <div key={row.subject} className="grid grid-cols-[1fr_80px_80px] px-5 py-3.5 border-b border-gray-50 last:border-0 items-center">
            <div>
              <p className="text-sm font-medium text-navy-950">{row.subject}</p>
              <p className="text-xs text-gray-400">{row.teacher} · Max {row.maxPerCIA}</p>
            </div>
            <div className="text-center">
              {row.cia1 != null ? (
                <span className={`inline-block text-sm font-semibold px-2 py-0.5 rounded ${markColor(row.cia1, row.maxPerCIA)}`}>
                  {row.cia1}
                </span>
              ) : (
                <span className="text-xs text-gray-300">—</span>
              )}
            </div>
            <div className="text-center">
              {row.cia2 != null ? (
                <span className={`inline-block text-sm font-semibold px-2 py-0.5 rounded ${markColor(row.cia2, row.maxPerCIA)}`}>
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
        Marks are indicative. CIA 2 results will be updated after grading is complete.
        Contact your teacher for any discrepancies.
      </p>
    </div>
  );
}
