import { useEffect, useState } from 'react';
import { Lightbulb, Users, Megaphone, Eye, Briefcase } from 'lucide-react';
import { api } from '../api/client';

const PRIORITY_CLASS = {
  High: 'bg-urgent-50 text-urgent-600',
  Medium: 'bg-duesoon-50 text-duesoon-600',
  Low: 'bg-today-50 text-today-600',
};

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analyticsSummary().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-20 text-center">Loading analytics...</div>;
  if (!data) return <div className="text-sm text-gray-400 py-20 text-center">No analytics available.</div>;

  const stats = [
    { label: 'Active Students', value: data.active_students, icon: Users, color: 'bg-brand-600' },
    { label: 'Announcements', value: data.announcements_count, icon: Megaphone, color: 'bg-today-600' },
    { label: 'Announcements Viewed', value: `${data.announcements_viewed_pct}%`, icon: Eye, color: 'bg-blue-600' },
    { label: 'Internship Applications', value: data.internship_applications, icon: Briefcase, color: 'bg-duesoon-500' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">Reports &amp; Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">A closer look at engagement across your classes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card rounded-lg p-5 flex items-center gap-3">
            <div className={`h-11 w-11 rounded-full ${color} flex items-center justify-center shrink-0`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold text-navy-950">{value}</p>
              <p className="text-xs text-gray-500 leading-snug">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card rounded-lg p-5">
          <h2 className="font-semibold text-navy-950 mb-4">Upcoming Deadlines</h2>
          <div className="space-y-3">
            {data.deadlines?.map((d) => (
              <div key={d.title} className="flex items-center justify-between text-sm border-b border-gray-50 pb-3 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">
                    {new Date(d.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-navy-950 font-medium truncate">{d.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_CLASS[d.priority] || 'bg-gray-50 text-gray-500'}`}>{d.priority}</span>
                  <span className="text-xs text-gray-400">{d.affected_students} students</span>
                </div>
              </div>
            ))}
            {!data.deadlines?.length && <p className="text-sm text-gray-400">No upcoming deadlines.</p>}
          </div>
        </div>

        <div className="card rounded-lg p-5">
          <h2 className="font-semibold text-navy-950 mb-4">Top Student Queries (Pulse AI)</h2>
          <div className="space-y-2">
            {data.top_queries?.map((q, idx) => (
              <div key={q.query_text} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                <span className="text-gray-600 truncate">{idx + 1}. {q.query_text}</span>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{q.hit_count} asks</span>
              </div>
            ))}
            {!data.top_queries?.length && <p className="text-sm text-gray-400">No queries logged yet.</p>}
          </div>

          {data.ai_insight && (
            <div className="bg-brand-50 rounded-xl p-3 flex gap-2 mt-5">
              <Lightbulb className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-brand-700 mb-0.5">AI Insight</p>
                <p className="text-[11px] text-brand-700/80 leading-snug">{data.ai_insight}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
