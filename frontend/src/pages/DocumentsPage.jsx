import { useEffect, useState } from 'react';
import { Download, FileText, EyeOff, Eye, Trash2, Upload } from 'lucide-react';
import { api } from '../api/client';
import DocumentsWidget from '../components/DocumentsWidget';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

function AdminDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  function load() {
    setLoading(true);
    api.documents(q ? { q } : {}).then(setDocuments).finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);

  async function handleTakeDown(doc) {
    if (!window.confirm(`Take down "${doc.title}"? Students will no longer see it.`)) return;
    await api.takeDownDocument(doc.id);
    load();
  }

  async function handleRestore(doc) {
    await api.restoreDocument(doc.id);
    load();
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Permanently delete "${doc.title}"? This cannot be undone.`)) return;
    await api.deleteDocument(doc.id);
    load();
  }

  async function handleUpload(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setUploading(true);
    try {
      await api.uploadDocument({
        title: form.get('title'),
        category: form.get('category'),
        audience: form.get('audience'),
        file: form.get('file'),
      });
      setUploadOpen(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">Documents &amp; Resources</h1>
          <p className="text-sm text-gray-500">Manage study materials and forms for students.</p>
        </div>
        <button onClick={() => setUploadOpen(true)} className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Upload Document
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search documents..."
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      <div className="card rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading...</p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-semibold">Title</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Audience</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className={`border-b border-gray-50 ${d.taken_down ? 'opacity-60' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-400 shrink-0" />
                      <span className="font-medium text-navy-950 truncate max-w-[200px]">{d.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{d.category}</td>
                  <td className="py-3 px-4 text-gray-500">{d.audience}</td>
                  <td className="py-3 px-4">
                    {d.taken_down
                      ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-urgent-600 bg-urgent-50 px-2 py-0.5 rounded"><EyeOff className="h-3 w-3" /> Taken Down</span>
                      : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-today-600 bg-today-50 px-2 py-0.5 rounded"><Eye className="h-3 w-3" /> Visible</span>
                    }
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1">
                      <a href={d.file_url} download className="p-1.5 rounded hover:bg-gray-50" title="Download">
                        <Download className="h-3.5 w-3.5 text-gray-500" />
                      </a>
                      {d.taken_down ? (
                        <button onClick={() => handleRestore(d)} className="p-1.5 rounded hover:bg-gray-50" title="Restore">
                          <Eye className="h-3.5 w-3.5 text-today-500" />
                        </button>
                      ) : (
                        <button onClick={() => handleTakeDown(d)} className="p-1.5 rounded hover:bg-gray-50" title="Take Down">
                          <EyeOff className="h-3.5 w-3.5 text-duesoon-500" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(d)} className="p-1.5 rounded hover:bg-gray-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-urgent-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!documents.length && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">No documents found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {uploadOpen && (
        <Modal title="Upload Document" onClose={() => setUploadOpen(false)}>
          <form onSubmit={handleUpload} className="space-y-3">
            <input name="title" placeholder="Document title" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
            <select name="category" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option>Study Material</option>
              <option>Hall Ticket</option>
              <option>Circular</option>
              <option>Form</option>
              <option>Result</option>
              <option>Other</option>
            </select>
            <select name="audience" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="All Students">All Students</option>
              <option value="BBA">BBA</option>
              <option value="BCom">BCom</option>
            </select>
            <input name="file" type="file" className="w-full text-sm" />
            <button disabled={uploading} className="w-full rounded-lg bg-brand-600 text-white text-sm font-semibold py-2.5 disabled:opacity-60">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StudentDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api.documents(q ? { q } : {}).then(setDocuments).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
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

export default function DocumentsPage() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDocumentsPage /> : <StudentDocumentsPage />;
}
