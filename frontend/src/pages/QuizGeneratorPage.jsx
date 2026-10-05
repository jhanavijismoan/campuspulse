import { useState } from 'react';
import { Sparkles, CheckCircle2, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';

const SUBJECTS = [
  'Business Communication', 'Marketing Management', 'Corporate Accounting',
  'English Language', 'Banking Law and Practice', 'Economics', 'Finance',
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function QuestionCard({ q, index }) {
  const [show, setShow] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3"
        onClick={() => setShow((v) => !v)}
      >
        <span className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {index + 1}
        </span>
        <p className="text-sm font-medium text-navy-950 flex-1">{q.question}</p>
        {show ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />}
      </button>
      {show && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-gray-50 pt-3">
          {(q.options || []).map((opt, i) => {
            const isAnswer = opt === q.answer;
            return (
              <div key={i} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${isAnswer ? 'bg-green-50 text-green-800 font-medium border border-green-200' : 'bg-gray-50 text-gray-700'}`}>
                {isAnswer && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                {opt}
              </div>
            );
          })}
          {q.explanation && (
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-medium">Explanation: </span>{q.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuizGeneratorPage() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setQuestions([]);
    try {
      const result = await api.generateQuiz({ subject, topic: topic.trim(), count, difficulty });
      setQuestions(result.questions || []);
      setSource(result.source || '');
    } catch (err) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  }

  function copyAll() {
    const text = questions.map((q, i) => {
      const opts = (q.options || []).map((o, j) => `  ${String.fromCharCode(65+j)}) ${o}`).join('\n');
      return `${i+1}. ${q.question}\n${opts}\nAnswer: ${q.answer}${q.explanation ? '\nExplanation: ' + q.explanation : ''}`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">Quiz Generator</h1>
        <p className="text-sm text-gray-500 mt-1">AI-generated multiple-choice questions — edit before use.</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Topic / Chapter</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Goodwill Valuation"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Number of Questions</label>
            <input
              type="number"
              value={count}
              min={1}
              max={20}
              onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize border transition ${difficulty === d ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={generate}
          disabled={loading || !topic.trim()}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? 'Generating…' : 'Generate Quiz'}
        </button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {questions.length} Questions
              {source === 'ai' && <span className="ml-2 text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">AI</span>}
              {source === 'fallback' && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Template</span>}
            </h2>
            <div className="flex gap-2">
              <button onClick={copyAll} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg font-medium">
                <Copy className="h-3 w-3" />
                {copied ? 'Copied!' : 'Copy all'}
              </button>
              <button onClick={generate} disabled={loading} className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg font-medium">
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
            </div>
          </div>
          {questions.map((q, i) => <QuestionCard key={i} q={q} index={i} />)}
          <p className="text-xs text-gray-400 text-center">Review and edit all questions before use. AI may make errors.</p>
        </div>
      )}
    </div>
  );
}
