import { useEffect, useState } from 'react';
import { api } from '../api/client';
import DocumentsWidget from '../components/DocumentsWidget';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .documents(q ? { q } : {})
        .then(setDocuments)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [q]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">Documents &amp; Forms</h1>
        <p className="text-sm text-gray-500">Study material, guidelines, and required forms.</p>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search documents..."
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">Loading...</div>
      ) : (
        <DocumentsWidget documents={documents} limit={documents.length} />
      )}
    </div>
  );
}
