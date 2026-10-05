import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
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
  const navigate = useNavigate();
  const outletCtx = useOutletContext();

  function load() {
    setLoading(true);
    api.notifications().then(setNotifications).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markOneRead(n) {
    if (!n.read) {
      await api.markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      outletCtx?.refreshUnreadCount?.();
    }
    if (n.action_url) navigate(n.action_url);
  }

  async function markAllRead() {
    await api.markAllNotificationsRead();
    load();
    outletCtx?.refreshUnreadCount?.();
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">Notifications</h1>
          {unread > 0 && <p className="text-sm text-gray-400">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">Loading...</div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markOneRead(n)}
              className={`flex gap-3 p-4 transition ${!n.read ? 'bg-brand-50/30' : ''} ${n.action_url ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${DOT_COLOR[n.severity] || 'bg-gray-300'} ${!n.read ? 'ring-2 ring-offset-1 ring-brand-300' : ''}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${!n.read ? 'font-semibold text-navy-950' : 'font-medium text-navy-800'}`}>{n.title}</p>
                <p className="text-sm text-gray-500">{n.body}</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-gray-300">{new Date(n.created_at).toLocaleString('en-IN')}</p>
                  {n.action_url && (
                    <span className="text-xs text-brand-500 font-medium">View →</span>
                  )}
                </div>
              </div>
              {!n.read && (
                <span className="h-2 w-2 rounded-full bg-brand-500 self-center shrink-0" />
              )}
            </div>
          ))}
          {!notifications.length && <p className="p-6 text-sm text-gray-400 text-center">No notifications.</p>}
        </div>
      )}
    </div>
  );
}
