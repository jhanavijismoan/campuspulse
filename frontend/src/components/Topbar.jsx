import { Search, Bell, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ unreadCount = 0 }) {
  const { user } = useAuth();

  return (
    <header className="h-16 shrink-0 border-b border-gray-100 bg-white flex items-center gap-4 px-6">
      <div className="flex-1 max-w-md relative">
        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search anything..."
          className="w-full rounded-lg bg-gray-50 border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-2 text-sm text-navy-950 font-medium">
        <GraduationCap className="h-5 w-5 text-brand-600" />
        {user?.university_name || 'CampusPulse'}
      </div>

      <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-50">
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-4 px-0.5 rounded-full bg-urgent-500 text-white text-[10px] flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </Link>

      <Link to="/profile" className="flex items-center gap-2 pl-2">
        <div className="h-9 w-9 rounded-full bg-brand-500 flex items-center justify-center text-sm font-semibold text-white">
          {user?.full_name?.[0] || 'U'}
        </div>
        <div className="hidden sm:block leading-tight">
          <p className="text-sm font-medium text-navy-950">{user?.full_name}</p>
          <p className="text-[11px] text-gray-400">{user?.semester || user?.role}</p>
        </div>
      </Link>
    </header>
  );
}
