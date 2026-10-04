import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Megaphone, Calendar as CalendarIcon,
  Briefcase, FileText, Sparkles, Bell, User, ChevronDown, Users, ClipboardList,
  BarChart3, MessageCircle, FileEdit,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Real, distinct routes only. These get the active-highlight treatment.
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/my-week', label: 'My Week', icon: CalendarDays },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/internships', label: 'Internship Opportunities', icon: Briefcase },
  { to: '/documents', label: 'Documents & Forms', icon: FileText },
  { to: '/cv-builder', label: 'CV Builder', icon: FileEdit },
  { to: '/pulse-ai', label: 'Pulse AI', icon: Sparkles },
];

const ADMIN_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/classes', label: 'My Classes', icon: Users },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/tasks', label: 'Assignments', icon: ClipboardList },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/documents', label: 'Documents & Resources', icon: FileText },
  { to: '/student-queries', label: 'Student Queries', icon: MessageCircle },
  { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { to: '/internships', label: 'Internship Opportunities', icon: Briefcase },
  { to: '/pulse-ai', label: 'Pulse AI', icon: Sparkles },
];

function NavItem({ to, label, icon: Icon, end, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition ${
          isActive ? 'bg-brand-600 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge > 0 && (
        <span className="text-[11px] bg-urgent-500 text-white rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-medium shrink-0">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar({ unreadCount = 0 }) {
  const { user } = useAuth();
  const navItems = user?.role === 'admin' ? ADMIN_NAV_ITEMS : NAV_ITEMS;

  return (
    <aside className="w-64 shrink-0 bg-navy-950 text-white flex flex-col h-screen sticky top-0 overflow-hidden">
      <Link to="/" className="px-4 py-4 flex items-center gap-2.5 shrink-0">
        <img src="/logo-icon.png" alt="" className="h-8 w-auto object-contain" />
        <span className="text-lg font-bold tracking-tight leading-none">
          <span className="text-white">Campus</span>
          <span className="text-brand-400">Pulse</span>
        </span>
      </Link>

      <nav className="flex-1 min-h-0 px-3 py-2 space-y-0.5 flex flex-col">
        {navItems.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}

        <NavItem to="/notifications" label="Notifications" icon={Bell} badge={unreadCount} />
        <NavItem to="/profile" label="Profile" icon={User} />
      </nav>

      {user && (
        <div className="m-3 mt-2 p-3 rounded-xl bg-white/5 flex items-center gap-2.5 shrink-0">
          <div className="h-9 w-9 rounded-full bg-brand-500 flex items-center justify-center text-sm font-semibold shrink-0">
            {user.full_name?.[0] || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.full_name}</p>
            <p className="text-[11px] text-white/50 truncate">
              {user.program ? `${user.program} — ${user.semester}` : user.role}
              {user.section ? ` ${user.section}` : ''}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-white/40 shrink-0" />
        </div>
      )}
    </aside>
  );
}
