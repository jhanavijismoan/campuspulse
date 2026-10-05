import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const PulseChatContext = createContext(null);

const STORAGE_KEY = (userId) => `campuspulse_chat_${userId}`;
const MAX_MESSAGES = 30;

export function PulseChatProvider({ children }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const prevUserRef = useRef(null);

  // Load persisted messages when user changes
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setOpen(false);
      return;
    }
    if (prevUserRef.current && prevUserRef.current !== user.id) {
      // User changed — clear old state
      setMessages([]);
    }
    prevUserRef.current = user.id;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY(user.id));
      if (stored) setMessages(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [user?.id]);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (!user?.id || messages.length === 0) return;
    try {
      sessionStorage.setItem(STORAGE_KEY(user.id), JSON.stringify(messages.slice(-MAX_MESSAGES)));
    } catch { /* ignore */ }
  }, [messages, user?.id]);

  async function send(text) {
    const message = text.trim();
    if (!message || loading) return;

    const userMsg = { role: 'user', text: message };
    setMessages((prev) => [...prev, userMsg].slice(-MAX_MESSAGES));
    setLoading(true);

    try {
      // Build history from current messages (exclude the one we just added)
      const history = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));
      const { reply, actions, source } = await api.askAi(message, history);
      setMessages((prev) => [...prev, { role: 'ai', text: reply, actions: actions || [], source }].slice(-MAX_MESSAGES));
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', text: `Sorry, something went wrong: ${err.message}`, actions: [], source: 'error' }].slice(-MAX_MESSAGES));
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setMessages([]);
    if (user?.id) {
      try { sessionStorage.removeItem(STORAGE_KEY(user.id)); } catch { /* ignore */ }
    }
  }

  return (
    <PulseChatContext.Provider value={{ messages, loading, send, clear, open, setOpen }}>
      {children}
    </PulseChatContext.Provider>
  );
}

export function usePulseChat() {
  const ctx = useContext(PulseChatContext);
  if (!ctx) throw new Error('usePulseChat must be used within PulseChatProvider');
  return ctx;
}
