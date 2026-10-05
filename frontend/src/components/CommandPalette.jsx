import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Megaphone, LayoutDashboard, X } from 'lucide-react';
import { api } from '../api/client';

const TYPE_ICON = {
  page: LayoutDashboard,
  document: FileText,
  announcement: Megaphone,
};

const TYPE_LABEL = {
  page: 'Page',
  document: 'Document',
  announcement: 'Announcement',
};

function ResultRow({ item, isActive, onSelect }) {
  const Icon = TYPE_ICON[item.type] || Search;
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
        isActive ? 'bg-brand-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-brand-100' : 'bg-gray-100'}`}>
        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-brand-600' : 'text-gray-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-brand-800' : 'text-navy-950'}`}>{item.title}</p>
        {item.subtitle && <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>}
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${isActive ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>
        {TYPE_LABEL[item.type] || item.type}
      </span>
    </button>
  );
}

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query);
        const flat = [
          ...(data.pages || []),
          ...(data.announcements || []),
          ...(data.documents || []),
        ];
        setResults(flat);
        setActiveIdx(0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((item) => {
    navigate(item.url);
    onClose();
  }, [navigate, onClose]);

  function handleKey(e) {
    if (e.key === 'Escape') { onClose(); return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, announcements, documents…"
            className="flex-1 text-sm bg-transparent outline-none text-navy-950 placeholder-gray-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 transition">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Searching…</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No results for "{query}"</div>
          )}
          {!loading && results.length > 0 && results.map((item, i) => (
            <ResultRow key={`${item.type}-${item.id}`} item={item} isActive={i === activeIdx} onSelect={handleSelect} />
          ))}
          {!query && (
            <div className="px-4 py-5 text-center text-xs text-gray-400">
              Type to search pages, announcements and documents
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
          <span><kbd className="font-mono border border-gray-200 rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono border border-gray-200 rounded px-1">↵</kbd> open</span>
          <span><kbd className="font-mono border border-gray-200 rounded px-1">Ctrl K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
