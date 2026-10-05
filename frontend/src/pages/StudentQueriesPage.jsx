import { useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle, Sparkles, Send, Plus, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

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
    api.myStudentQueries().then(setQueries).catch(() => setQueries([])).finally(() => setLoading(false));
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

// ── Admin: Answer Now modal ────────────────────────────────────────────────────

function AnswerModal({ query, onClose, onSent }) {
  const [reply, setReply] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftNote, setDraftNote] = useState('');

  async function getDraft() {
    setDrafting(true);
    setDraftNote('');
    try {
      const { draft, source } = await api.draftQueryReply(query.id);
      setReply(draft);
      setDraftNote(source === 'ai' ? 'AI-generated draft — review before sending.' : 'Rule-based draft — edit as needed.');
    } catch (err) {
      setDraftNote('Draft failed: ' + err.message);
    } finally {
      setDrafting(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      await api.updateStudentQuery(query.id, { answered: true, reply: reply.trim() });
      onSent();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to send answer');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="Answer Query" onClose={onClose}>
      <div className="space-y-4">
        {/* Query details */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">From</p>
            <p className="text-xs font-medium text-navy-950">{query.student_name || 'Student'}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">Subject</p>
            <p className="text-xs font-medium text-navy-950">{query.subject}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">Date</p>
            <p className="text-xs text-gray-400">{new Date(query.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">Status</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${query.answered ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {query.answered ? 'Answered' : 'Open'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">Question</p>
          <p className="text-sm text-gray-700">{query.message}</p>
        </div>

        <form onSubmit={handleSend} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-navy-950">Your Answer</label>
            <button
              type="button"
              onClick={getDraft}
              disabled={drafting}
              className="flex items-center gap-1 text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium px-2.5 py-1 rounded-lg"
            >
              <Sparkles className="h-3 w-3" />
              {drafting ? 'Drafting…' : 'Get AI Draft'}
            </button>
          </div>
          {draftNote && <p className="text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1">{draftNote}</p>}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={5}
            placeholder="Write your reply here. The student will be notified when you send."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Sending…' : 'Send Answer'}
          </button>
        </form>
      </div>
    </Modal>
  );
}

function AdminQueryCard({ query, onUpdate }) {
  const [answerOpen, setAnswerOpen] = useState(false);

  return (
    <>
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
            <p className="text-xs text-gray-400 mt-0.5">{query.student_name} · {query.subject_name || 'General'}</p>
            <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{query.message}</p>
            {query.reply && (
              <div className="mt-2 bg-green-50 rounded-lg p-2.5 text-xs text-green-900 border border-green-100">
                <span className="font-semibold">Your reply: </span>{query.reply}
              </div>
            )}
          </div>

          {!query.answered && (
            <button
              onClick={() => setAnswerOpen(true)}
              className="shrink-0 flex items-center gap-1 text-xs bg-brand-600 hover:bg-brand-700 text-white font-semibold px-3 py-1.5 rounded-lg"
            >
              <Send className="h-3 w-3" />
              Answer Now
            </button>
          )}
        </div>
      </div>

      {answerOpen && (
        <AnswerModal query={query} onClose={() => setAnswerOpen(false)} onSent={onUpdate} />
      )}
    </>
  );
}

function AdminView() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.studentQueries().then(setQueries).catch(() => setQueries([])).finally(() => setLoading(false));
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
          {open.length} open · {answered.length} answered
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

export default function StudentQueriesPage() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminView /> : <StudentView />;
}
