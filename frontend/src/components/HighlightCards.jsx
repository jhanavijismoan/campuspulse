import { AlertCircle, FolderKanban, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  urgent: {
    badge: 'URGENT',
    badgeClass: 'bg-urgent-50 text-urgent-600',
    iconBg: 'bg-urgent-500',
    buttonClass: 'bg-urgent-500 hover:bg-urgent-600',
  },
  due_soon: {
    badge: 'DUE SOON',
    badgeClass: 'bg-duesoon-50 text-duesoon-600',
    iconBg: 'bg-duesoon-500',
    buttonClass: 'bg-duesoon-500 hover:bg-duesoon-600',
  },
  upcoming: {
    badge: 'TODAY',
    badgeClass: 'bg-today-50 text-today-600',
    iconBg: 'bg-today-500',
    buttonClass: 'bg-today-500 hover:bg-today-600',
  },
};

function iconFor(type) {
  if (type === 'exam') return AlertCircle;
  if (type === 'presentation' || type === 'assignment') return FolderKanban;
  return Briefcase;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function HighlightCards({ items }) {
  const navigate = useNavigate();
  if (!items?.length) {
    return (
      <div className="card p-6 text-sm text-gray-400">
        You're all caught up — nothing urgent right now.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.slice(0, 3).map((item) => {
        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.upcoming;
        const Icon = iconFor(item.event_type);
        const isToday = new Date(item.starts_at).toDateString() === new Date().toDateString();
        const badge = isToday && item.status === 'upcoming' ? 'TODAY' : config.badge;

        return (
          <div key={item.id} className="card p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className={`h-11 w-11 rounded-xl ${config.iconBg} flex items-center justify-center`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <span className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-full ${config.badgeClass}`}>
                {badge}
              </span>
            </div>

            <div>
              <h3 className="font-semibold text-navy-950 text-sm mb-2">{item.title}</h3>
              <div className="text-xs text-gray-500 space-y-1">
                {item.event_type === 'exam' && (
                  <>
                    <p><span className="font-medium text-gray-600">Exam:</span> {item.title}</p>
                    <p><span className="font-medium text-gray-600">Date:</span> {formatDate(item.starts_at)}</p>
                  </>
                )}
                {item.event_type !== 'exam' && item.event_type !== 'meeting' && (
                  <p><span className="font-medium text-gray-600">Due:</span> {formatDate(item.starts_at)}</p>
                )}
                {item.event_type === 'meeting' && (
                  <>
                    <p><span className="font-medium text-gray-600">Time:</span> {formatTime(item.starts_at)}</p>
                    {item.location && <p><span className="font-medium text-gray-600">Location:</span> {item.location}</p>}
                  </>
                )}
                {item.description && item.event_type === 'exam' && (
                  <p className="text-gray-400">{item.description}</p>
                )}
                <p className="pt-1">
                  <span className="font-medium text-gray-600">Action:</span>{' '}
                  {item.action_label || 'Review details before the deadline.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => item.action_url && navigate(item.action_url)}
              className={`mt-auto text-white text-xs font-medium rounded-lg py-2.5 transition ${config.buttonClass} ${!item.action_url ? 'opacity-60 cursor-default' : ''}`}
            >
              {item.action_label || 'View Details'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
