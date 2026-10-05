import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { usePulseChat } from '../context/PulseChatContext';

// Tiny safe text formatter — supports **bold** and "- " bullets, no dangerouslySetInnerHTML
function FormattedText({ text }) {
  const lines = (text || '').split('\n');
  return (
    <span>
      {lines.map((line, li) => {
        const isBullet = line.startsWith('- ');
        const content = isBullet ? line.slice(2) : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, pi) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pi}>{part.slice(2, -2)}</strong>;
          }
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
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function PulseAI({ compact = false }) {
  const { messages, loading, send, clear } = usePulseChat();
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.aiSuggestions().then(setSuggestions).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  function handleSend(text) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    send(msg);
  }

  return (
    <div className="card p-5 flex flex-col" style={{ minHeight: compact ? 420 : 520 }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-navy-950">Pulse AI</h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Clear chat
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">Your AI college assistant</p>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
        {messages.length === 0 &&
          suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="w-full text-left text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg px-3 py-2.5 transition"
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
              {/* Source label for rules mode */}
              {m.role === 'ai' && m.source === 'rules' && (
                <p className="text-[10px] text-gray-400 mt-0.5 pl-1">Rule-based mode</p>
              )}
              {/* Navigate action pills */}
              {m.role === 'ai' && m.actions?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {m.actions.map((action, ai) => (
                    <button
                      key={ai}
                      onClick={() => navigate(action.to)}
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 border-t border-gray-100 pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask anything..."
          className="flex-1 text-sm rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-9 w-9 shrink-0 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center"
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </form>
    </div>
  );
}
