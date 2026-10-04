import { Link } from 'react-router-dom';

const TYPE_DOT = {
  exam: 'bg-urgent-500',
  assignment: 'bg-duesoon-500',
  presentation: 'bg-blue-500',
  meeting: 'bg-today-500',
  association_work: 'bg-violet-500',
  class: 'bg-gray-400',
};

const LEGEND = [
  { label: 'Exams', color: 'bg-urgent-500' },
  { label: 'Assignments', color: 'bg-duesoon-500' },
  { label: 'Presentations', color: 'bg-blue-500' },
  { label: 'Meetings', color: 'bg-today-500' },
  { label: 'Association Work', color: 'bg-violet-500' },
  { label: 'Classes', color: 'bg-gray-400' },
];

function groupByDay(events) {
  const days = {};
  for (const e of events) {
    const d = new Date(e.starts_at);
    const key = d.toDateString();
    if (!days[key]) days[key] = { date: d, events: [] };
    days[key].events.push(e);
  }
  return Object.values(days).sort((a, b) => a.date - b.date);
}

function formatTimeLabel(event) {
  const d = new Date(event.starts_at);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return event.description && !event.description.includes(':') ? event.description : time;
}

export default function MyWeek({ events, title = 'My Week', showFullLink = true }) {
  const days = groupByDay(events || []);
  const today = new Date().toDateString();

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-navy-950">{title}</h2>
        {showFullLink && (
          <Link to="/calendar" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View Full Calendar →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {days.map(({ date, events: dayEvents }) => {
          const isToday = date.toDateString() === today;
          return (
            <div key={date.toISOString()} className="min-w-0">
              <div className="flex items-center gap-1.5 mb-2 text-xs">
                <span className="text-gray-400 font-medium">
                  {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
                <span
                  className={`h-5 min-w-5 px-1 rounded-full flex items-center justify-center font-semibold ${
                    isToday ? 'bg-brand-600 text-white' : 'text-gray-500'
                  }`}
                >
                  {date.getDate()}
                </span>
                <span className="text-gray-400">
                  {date.toLocaleDateString('en-IN', { month: 'short' })}
                </span>
              </div>

              <div className="space-y-2">
                {dayEvents.map((e) => (
                  <div key={e.id} className="rounded-lg bg-gray-50 p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[e.event_type] || 'bg-gray-400'}`} />
                    </div>
                    <p className="font-medium text-navy-950 leading-tight mb-1">{e.title}</p>
                    <p className="text-gray-400">{formatTimeLabel(e)}</p>
                  </div>
                ))}
                {!dayEvents.length && <div className="text-[11px] text-gray-300 italic">No events</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 pt-4 border-t border-gray-100">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className={`h-2 w-2 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
