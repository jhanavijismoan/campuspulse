import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { api } from '../api/client';

export default function PulseAI({ compact = false }) {
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.aiSuggestions().then(setSuggestions).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setLoading(true);
    try {
      const { reply } = await api.askAi(message);
      setMessages((prev) => [...prev, { role: 'ai', text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', text: `Sorry, something went wrong: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5 flex flex-col" style={{ minHeight: compact ? 420 : 520 }}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <h2 className="font-semibold text-navy-950">Pulse AI</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">Your AI college assistant</p>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
        {messages.length === 0 &&
          suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="w-full text-left text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg px-3 py-2.5 transition"
            >
              {s}
            </button>
          ))}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] text-xs rounded-xl px-3 py-2 whitespace-pre-line ${
                m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-navy-950'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-400 text-xs rounded-xl px-3 py-2">Thinking...</div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-gray-100 pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 text-sm rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-9 w-9 shrink-0 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center"
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </form>
    </div>
  );
}
