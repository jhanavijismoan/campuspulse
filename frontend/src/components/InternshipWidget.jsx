import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export default function InternshipWidget({ internships = [], limit = 3, showApply = false, onApply }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-navy-950">Internship Opportunities (For You)</h2>
        <Link to="/internships" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          View All Opportunities
        </Link>
      </div>

      <div className="space-y-4">
        {internships.slice(0, limit).map((i) => (
          <div key={i.id} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
            <div className="h-10 w-10 rounded-lg bg-navy-900 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy-950">{i.company_name}</p>
              <p className="text-xs text-gray-500">{i.role_title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {i.location} {i.work_mode ? `· ${i.work_mode}` : ''}
              </p>
              {i.stipend_text && <p className="text-xs text-gray-500 mt-0.5">Stipend: {i.stipend_text}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(i.tags || []).map((t) => (
                  <span key={t} className="text-[10px] bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
              {showApply && (
                <button
                  onClick={() => onApply?.(i.id)}
                  disabled={i.application_status !== 'suggested'}
                  className="mt-3 text-xs font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-1.5"
                >
                  {i.application_status === 'suggested' ? 'Apply Now' : 'Applied'}
                </button>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-today-600">{i.match_score}%</p>
              <p className="text-[10px] text-gray-400">Match</p>
            </div>
          </div>
        ))}
        {!internships.length && <p className="text-xs text-gray-400">No matches yet — check back soon.</p>}
      </div>
    </div>
  );
}
