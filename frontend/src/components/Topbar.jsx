import { Search, Bell, GraduationCap, LayoutDashboard, FileText, Megaphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useState, useRef, useEffect, useCallback } from 'react';

const TYPE_ICON = { page: LayoutDashboard, document: FileText, announcement: Megaphone };
const TYPE_LABEL = { page: 'Page', document: 'Doc', announcement: 'Announcement' };

function SearchDropdown({ results, loading, query, onSelect, visible }) {
  if (!visible) return null;
  const Icon = ({ type }) => { const I = TYPE_ICON[type] || Search; return <I className="h-3.5 w-3.5" />; };
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden max-h-72 overflow-y-auto">
      {loading && <div className="px-4 py-3 text-sm text-gray-400 text-center">Searching…</div>}
      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-400 text-center">No results for "{query}"</div>
      )}
      {!loading && results.map((item) => (
        <button
          key={`${item.type}-${item.id}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition"
        >
          <div className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
            <Icon type={item.type} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-navy-950 truncate">{item.title}</p>
            {item.subtitle && <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>}
          </div>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
            {TYPE_LABEL[item.type] || item.type}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Topbar({ unreadCount = 0, onOpenPalette }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query);
        const flat = [...(data.pages || []), ...(data.announcements || []), ...(data.documents || [])];
        setResults(flat);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((item) => {
    navigate(item.url);
    setQuery('');
    setResults([]);
    setFocused(false);
  }, [navigate]);

  function handleInputClick() {
    if (onOpenPalette) { onOpenPalette(); }
    else { inputRef.current?.focus(); setFocused(true); }
  }

  const showDropdown = focused && (loading || results.length > 0 || query.length >= 2);

  return (
    <header className="h-16 shrink-0 border-b border-gray-100 bg-white flex items-center gap-4 px-6">
      <div className="flex-1 max-w-md relative">
        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onClick={handleInputClick}
          placeholder="Search anything… (Ctrl K)"
          className="w-full rounded-lg bg-gray-50 border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <SearchDropdown
          results={results}
          loading={loading}
          query={query}
          onSelect={handleSelect}
          visible={showDropdown}
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
