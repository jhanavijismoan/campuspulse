import { useEffect, useRef } from 'react';
import { Sparkles, X, Send, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePulseChat } from '../context/PulseChatContext';
import { useState } from 'react';
import { api } from '../api/client';

// Reuse the same tiny formatter from PulseAI
function FormattedText({ text }) {
  const lines = (text || '').split('\n');
  return (
    <span>
      {lines.map((line, li) => {
        const isBullet = line.startsWith('- ');
        const content = isBullet ? line.slice(2) : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, pi) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={pi}>{part.slice(2, -2)}</strong>;
          return part;
        });
        return (
          <span key={li}>
            {li > 0 && <br />}
            {isBullet ? <span>• {rendered}</span> : rendered}
          </span>
        );
      })}
    </span>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export default function PulseAILauncher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { messages, loading, send, clear, open, setOpen } = usePulseChat();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Hide on /pulse-ai and /login
  const hidden = location.pathname === '/pulse-ai' || location.pathname === '/login';

  useEffect(() => {
    if (!hidden) api.aiSuggestions().then(setSuggestions).catch(() => {});
  }, [hidden]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        if (!hidden) setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hidden, setOpen]);

  function handleSend(text) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    send(msg);
  }

  function handleActionClick(to) {
    navigate(to);
    // Close on mobile (< 640px), keep open on desktop
    if (window.innerWidth < 640) setOpen(false);
  }

  if (hidden) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-brand-600 hover:bg-brand-700 shadow-lg flex items-center justify-center transition"
          title="Open Pulse AI (Ctrl+/)"
        >
          <Sparkles className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-24px)] sm:w-[380px] max-h-[70vh] rounded-2xl shadow-2xl bg-white border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <span className="font-semibold text-sm text-navy-950">Pulse AI</span>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={clear} className="text-xs text-gray-400 hover:text-gray-600 transition">Clear</button>
              )}
              <button onClick={() => setOpen(false)} className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 p-3">
            {messages.length === 0 &&
              suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="w-full text-left text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg px-3 py-2 transition"
                >
                  {s}
                </button>
              ))}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  <div
                    className={`text-xs rounded-xl px-3 py-2 whitespace-pre-line ${
                      m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-navy-950'
                    }`}
                  >
                    <FormattedText text={m.text} />
                  </div>
                  {m.role === 'ai' && m.source === 'rules' && (
                    <p className="text-[10px] text-gray-400 mt-0.5 pl-1">Rule-based mode</p>
                  )}
                  {m.role === 'ai' && m.actions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {m.actions.map((action, ai) => (
                        <button
                          key={ai}
                          onClick={() => handleActionClick(action.to)}
                          className="inline-flex items-center gap-1 text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-full px-2.5 py-1 transition"
                        >
                          {action.label}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-400 text-xs rounded-xl px-3 py-2">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 border-t border-gray-100 p-3 shrink-0"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask anything..."
              disabled={loading}
              className="flex-1 text-sm rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-8 w-8 shrink-0 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
