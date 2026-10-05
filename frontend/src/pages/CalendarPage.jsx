import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import CalendarWidget from '../components/CalendarWidget';
import AdminCalendarPage from './AdminCalendarPage';

const TYPE_COLOR = {
  exam: 'bg-urgent-500',
  assignment: 'bg-duesoon-500',
  presentation: 'bg-blue-500',
  meeting: 'bg-today-500',
  association_work: 'bg-violet-500',
  class: 'bg-gray-400',
  holiday: 'bg-today-500',
  event: 'bg-blue-400',
  deadline: 'bg-duesoon-500',
  general: 'bg-gray-400',
};

function StudentCalendarPage() {
  const [personalEvents, setPersonalEvents] = useState([]);
  const [broadcastEvents, setBroadcastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10);
    Promise.all([
      api.events(from, to).catch(() => []),
      api.calendarEvents({ from, to }).catch(() => []),
    ]).then(([personal, broadcast]) => {
      setPersonalEvents(personal);
      setBroadcastEvents(broadcast);
    }).finally(() => setLoading(false));
  }, []);

  // Normalise broadcast events to same shape as personal events for CalendarWidget
  const allEvents = [
    ...personalEvents,
    ...broadcastEvents.map((e) => ({
      id: `broadcast-${e.id}`,
      title: e.title,
      event_type: e.event_type,
      description: e.description,
      location: e.location,
      starts_at: `${e.event_date}T${e.start_time || '00:00'}:00`,
      ends_at: e.end_time ? `${e.event_date}T${e.end_time}:00` : null,
      all_day: !e.start_time,
      broadcast: true,
    })),
  ];

  const upcoming = [...allEvents]
    .filter((e) => new Date(e.starts_at) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-navy-950">Calendar</h1>

      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
          <CalendarWidget events={allEvents} />

          <div className="card p-5">
            <h2 className="font-semibold text-navy-950 mb-4">All Upcoming Events</h2>
            <div className="space-y-3">
              {upcoming.map((e) => (
                <div key={e.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                  <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${TYPE_COLOR[e.event_type] || 'bg-gray-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-navy-950">{e.title}</p>
                      {e.broadcast && <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-medium">University</span>}
                    </div>
                    {e.description && <p className="text-xs text-gray-400">{e.description}</p>}
                    {e.location && <p className="text-xs text-gray-400">📍 {e.location}</p>}
                  </div>
                  <div className="text-right shrink-0 text-xs text-gray-500">
                    <p>{new Date(e.starts_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                    {!e.all_day && <p className="text-gray-400">{new Date(e.starts_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>}
                  </div>
                </div>
              ))}
              {!upcoming.length && <p className="text-sm text-gray-400">No upcoming events.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminCalendarPage /> : <StudentCalendarPage />;
}
