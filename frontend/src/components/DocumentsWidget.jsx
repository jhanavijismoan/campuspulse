import { Link } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';

export default function DocumentsWidget({ documents = [], limit = 5 }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-navy-950">Documents &amp; Forms</h2>
        <Link to="/documents" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {documents.slice(0, limit).map((d) => (
          <div key={d.id} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-navy-950 truncate">{d.title}</p>
              <p className="text-xs text-gray-400 truncate">
                {d.category} · Updated {new Date(d.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <a
              href={d.file_url}
              download
              className="shrink-0 flex items-center gap-1 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-navy-950 rounded-lg px-2.5 py-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </div>
        ))}
        {!documents.length && <p className="text-xs text-gray-400">No documents available.</p>}
      </div>

      <Link to="/documents" className="mt-4 flex justify-center text-xs font-medium text-brand-600 hover:text-brand-700 pt-3 border-t border-gray-100">
        View All Documents →
      </Link>
    </div>
  );
}
