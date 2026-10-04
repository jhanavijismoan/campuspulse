import { useEffect, useState } from 'react';
import { api } from '../api/client';

const DOT_COLOR = {
  urgent: 'bg-urgent-500',
  warning: 'bg-duesoon-500',
  success: 'bg-today-500',
  info: 'bg-blue-500',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.notifications().then(setNotifications).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markAllRead() {
    await api.markAllNotificationsRead();
    load();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-950">Notifications</h1>
        <button onClick={markAllRead} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Mark all as read
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">Loading...</div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {notifications.map((n) => (
            <div key={n.id} className={`flex gap-3 p-4 ${!n.read ? 'bg-brand-50/30' : ''}`}>
              <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${DOT_COLOR[n.severity] || 'bg-gray-300'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy-950">{n.title}</p>
                <p className="text-sm text-gray-500">{n.body}</p>
                <p className="text-xs text-gray-300 mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
          {!notifications.length && <p className="p-6 text-sm text-gray-400 text-center">No notifications.</p>}
        </div>
      )}
    </div>
  );
}
