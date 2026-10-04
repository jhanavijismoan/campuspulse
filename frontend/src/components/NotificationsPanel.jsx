import { Link } from 'react-router-dom';

const DOT_COLOR = {
  urgent: 'bg-urgent-500',
  warning: 'bg-duesoon-500',
  success: 'bg-today-500',
  info: 'bg-blue-500',
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function NotificationsPanel({ items = [] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-navy-950">Notifications</h2>
        <Link to="/notifications" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          View All
        </Link>
      </div>

      <div className="space-y-4">
        {items.slice(0, 3).map((n) => (
          <div key={n.id} className="flex gap-2.5">
            <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${DOT_COLOR[n.severity] || 'bg-gray-300'}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy-950 leading-snug">{n.title}</p>
              <p className="text-xs text-gray-500 leading-snug">{n.body}</p>
              <p className="text-[11px] text-gray-300 mt-0.5">{timeAgo(n.created_at)}</p>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-xs text-gray-400">No notifications yet.</p>}
      </div>

      <Link
        to="/notifications"
        className="mt-4 flex items-center justify-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 border-t border-gray-100 pt-3"
      >
        View All Notifications →
      </Link>
    </div>
  );
}
