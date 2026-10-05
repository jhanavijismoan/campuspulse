import { useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle, Sparkles, Send, Plus, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Student view ──────────────────────────────────────────────────────────────

function AskQueryForm({ onSubmit }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.submitStudentQuery({ subject: subject.trim(), message: message.trim() });
      setSubject('');
      setMessage('');
      onSubmit();
    } catch (err) {
      setError(err.message || 'Failed to submit query');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
      <h2 className="font-semibold text-navy-950 flex items-center gap-2">
        <Plus className="h-4 w-4 text-brand-600" /> Ask a Question
      </h2>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={200}
        placeholder="Subject (e.g. CIA seating plan, Blue Book submission)"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        required
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Describe your question in detail…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        required
      />
      <button
        type="submit"
        disabled={submitting || !subject.trim() || !message.trim()}
        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
      >
        <Send className="h-3.5 w-3.5" />
        {submitting ? 'Submitting…' : 'Submit Query'}
      </button>
    </form>
  );
}

function StudentView() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.myStudentQueries()
      .then(setQueries)
      .catch(() => setQueries([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">Ask a Teacher</h1>
        <p className="text-sm text-gray-500 mt-1">Submit questions to your teachers and track replies.</p>
      </div>

      <AskQueryForm onSubmit={load} />

      {queries.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
          <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">You haven't asked any questions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Questions</h2>
          {queries.map((q) => (
            <div key={q.id} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-l-4 ${q.answered ? 'border-l-green-500' : 'border-l-amber-400'}`}>
              <div className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${q.answered ? 'bg-green-50' : 'bg-amber-50'}`}>
                  {q.answered ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <MessageCircle className="h-4 w-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy-950 text-sm">{q.subject}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${q.answered ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {q.answered ? 'Answered' : 'Awaiting reply'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{q.message}</p>
                  {q.reply && (
                    <div className="mt-2 bg-brand-50 rounded-lg p-3 text-sm text-brand-900 border border-brand-100">
                      <p className="text-xs font-semibold text-brand-600 mb-1">Reply from {q.admin_name || 'Teacher'}:</p>
                      {q.reply}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin view ────────────────────────────────────────────────────────────────

function AdminQueryCard({ query, onUpdate }) {
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showReply, setShowReply] = useState(false);

  async function getDraft() {
    setDrafting(true);
    try {
      const { draft: d } = await api.draftQueryReply(query.id);
      setDraft(d);
      setShowReply(true);
    } catch (err) {
      setDraft('Failed to draft reply: ' + err.message);
      setShowReply(true);
    } finally {
      setDrafting(false);
    }
  }

  async function sendReply() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await api.updateStudentQuery(query.id, { answered: true, reply: draft.trim() });
      onUpdate();
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-l-4 ${query.answered ? 'border-l-green-400 opacity-70' : 'border-l-brand-500'}`}>
      <div className="flex items-start gap-3">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${query.answered ? 'bg-green-50' : 'bg-brand-50'}`}>
          {query.answered ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <MessageCircle className="h-4 w-4 text-brand-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-navy-950 text-sm">{query.subject}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${query.answered ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {query.answered ? 'Answered' : 'Open'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{query.student_name} · {query.subject_name}</p>
          <p className="text-sm text-gray-600 mt-1.5">{query.message}</p>

          {showReply && !query.answered && (
            <div className="mt-2 space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Write your reply…"
              />
              <div className="flex gap-2">
                <button
                  onClick={sendReply}
                  disabled={sending || !draft.trim()}
                  className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                >
                  <Send className="h-3 w-3" />
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
                <button onClick={() => setShowReply(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {!query.answered && !showReply && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={getDraft}
              disabled={drafting}
              title="Draft AI reply"
              className="flex items-center gap-1 text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium px-2.5 py-1.5 rounded-lg transition"
            >
              <Sparkles className="h-3 w-3" />
              {drafting ? 'Drafting…' : 'AI Draft'}
            </button>
            <button
              onClick={() => { setDraft(''); setShowReply(true); }}
              className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium px-2.5 py-1.5 rounded-lg"
            >
              Reply
            </button>
            <button
              onClick={() => api.updateStudentQuery(query.id, { answered: true }).then(onUpdate)}
              className="text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium px-2.5 py-1.5 rounded-lg"
            >
              Mark Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminView() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.studentQueries()
      .then(setQueries)
      .catch(() => setQueries([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const open = queries.filter((q) => !q.answered);
  const answered = queries.filter((q) => q.answered);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">Student Queries</h1>
        <p className="text-sm text-gray-500 mt-1">
          {open.length} open · {answered.length} answered — Use "AI Draft" to get a suggested reply.
        </p>
      </div>

      <div className="space-y-3">
        {!queries.length && (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-400">No student queries yet.</p>
          </div>
        )}
        {open.map((q) => <AdminQueryCard key={q.id} query={q} onUpdate={load} />)}
        {answered.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Answered</p>
            {answered.map((q) => <AdminQueryCard key={q.id} query={q} onUpdate={load} />)}
          </>
        )}
      </div>
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function StudentQueriesPage() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminView /> : <StudentView />;
}
