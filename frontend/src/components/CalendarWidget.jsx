import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TYPE_COLOR = {
  exam: 'text-urgent-600',
  assignment: 'text-duesoon-600',
  presentation: 'text-blue-600',
  meeting: 'text-today-600',
};

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // make Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function CalendarWidget({ events = [] }) {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = buildMonthGrid(year, month);
  const today = new Date();

  const eventsByDay = {};
  for (const e of events) {
    const d = new Date(e.starts_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      eventsByDay[d.getDate()] = eventsByDay[d.getDate()] || [];
      eventsByDay[d.getDate()].push(e);
    }
  }

  const upcoming = [...events]
    .filter((e) => new Date(e.starts_at) >= new Date(today.toDateString()))
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0, 2);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-navy-950">Calendar</h2>
        <Link to="/calendar" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-gray-50">
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
        <span className="text-xs font-medium text-navy-950">
          {cursor.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        </span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-gray-50">
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400 mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          const isToday = d && d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const hasEvents = d && eventsByDay[d];
          return (
            <div
              key={idx}
              className={`h-7 flex items-center justify-center text-[11px] rounded-md relative ${
                isToday ? 'bg-brand-600 text-white font-semibold' : d ? 'text-gray-600' : ''
              }`}
            >
              {d || ''}
              {hasEvents && !isToday && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-urgent-500" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
        {upcoming.map((e) => (
          <div key={e.id} className="text-xs">
            <p className={`font-medium ${TYPE_COLOR[e.event_type] || 'text-navy-950'}`}>{e.title}</p>
            <p className="text-gray-400">
              {new Date(e.starts_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ·{' '}
              {new Date(e.starts_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        ))}
        {!upcoming.length && <p className="text-xs text-gray-400">Nothing else scheduled.</p>}
      </div>

      <Link to="/calendar" className="mt-4 flex justify-center text-xs font-medium text-brand-600 hover:text-brand-700 pt-3 border-t border-gray-100">
        View Full Calendar →
      </Link>
    </div>
  );
}
