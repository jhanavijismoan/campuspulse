import { useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { api } from '../api/client';

export default function StudentQueriesPage() {
  const [queries, setQueries] = useState([]);

  async function load() {
    setQueries(await api.studentQueries());
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">Student Queries</h1>
        <p className="text-sm text-gray-500 mt-1">Questions awaiting an admin response.</p>
      </div>

      <div className="card rounded-lg p-5">
        <div className="space-y-4">
          {queries.map((query) => (
            <div key={query.id} className="flex items-start gap-4 border-b border-gray-50 pb-4 last:border-0">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${query.answered ? 'bg-today-50' : 'bg-blue-50'}`}>
                {query.answered ? <CheckCircle2 className="h-5 w-5 text-today-600" /> : <MessageCircle className="h-5 w-5 text-blue-600" />}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-navy-950">{query.subject}</h2>
                  <span className={`text-[11px] font-semibold rounded px-2 py-0.5 ${query.answered ? 'bg-today-50 text-today-600' : 'bg-duesoon-50 text-duesoon-600'}`}>
                    {query.answered ? 'Answered' : 'Awaiting response'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{query.student_name} - {query.subject_name}</p>
                <p className="text-sm text-gray-600 mt-2">{query.message}</p>
              </div>
              {!query.answered && (
                <button onClick={() => api.updateStudentQuery(query.id, { answered: true }).then(load)} className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-3 py-2">
                  Mark Answered
                </button>
              )}
            </div>
          ))}
          {!queries.length && <p className="text-sm text-gray-400">No student queries yet.</p>}
        </div>
      </div>
    </div>
  );
}
