import { Lightbulb } from 'lucide-react';

const PRIORITY_CLASS = {
  High: 'bg-urgent-50 text-urgent-600',
  Medium: 'bg-duesoon-50 text-duesoon-600',
  Low: 'bg-today-50 text-today-600',
};

export default function AdminAnalytics({ data }) {
  if (!data) return null;

  const stats = [
    { label: 'Active Students', value: data.active_students },
    { label: 'Announcements', value: data.announcements_count },
    { label: 'Announcements Viewed', value: `${data.announcements_viewed_pct}%` },
    { label: 'Opportunities Applications', value: data.internship_applications },
  ];

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-navy-950 mb-4">Admin Analytics</h2>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-bold text-navy-950">{s.value}</p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-navy-950">Upcoming Deadlines</p>
        <button className="text-[11px] text-brand-600 font-medium">View All</button>
      </div>
      <div className="space-y-2 mb-5">
        {data.deadlines?.map((d) => (
          <div key={d.title} className="flex items-center justify-between text-xs">
            <div className="min-w-0">
              <p className="text-gray-400 text-[10px]">
                {new Date(d.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </p>
              <p className="text-navy-950 font-medium truncate">{d.title}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_CLASS[d.priority]}`}>
                {d.priority}
              </span>
              <span className="text-[10px] text-gray-400">{d.affected_students} Students</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold text-navy-950 mb-2">Top Student Queries</p>
      <div className="space-y-1.5 mb-5">
        {data.top_queries?.map((q, idx) => (
          <div key={q.query_text} className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {idx + 1}. {q.query_text}
            </span>
            <span className="text-gray-400">{q.hit_count}</span>
          </div>
        ))}
      </div>

      {data.ai_insight && (
        <div className="bg-brand-50 rounded-xl p-3 flex gap-2">
          <Lightbulb className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-brand-700 mb-0.5">AI Insight</p>
            <p className="text-[11px] text-brand-700/80 leading-snug">{data.ai_insight}</p>
          </div>
        </div>
      )}

      <button className="mt-4 w-full text-center text-xs font-medium text-brand-600 hover:text-brand-700 pt-3 border-t border-gray-100">
        View Full Analytics →
      </button>
    </div>
  );
}
