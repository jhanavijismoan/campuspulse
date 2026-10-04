import { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AnnouncementProcessor() {
  const { user } = useAuth();
  const [rawText, setRawText] = useState(
    'Students of II BBA are informed that CIA seating plans are available. Students must check their seating plan before the exam and report any discrepancies to the examination cell by 13th August.'
  );
  const [extracted, setExtracted] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [published, setPublished] = useState(false);

  async function handleProcess() {
    if (!rawText.trim()) return;
    setProcessing(true);
    setPublished(false);
    try {
      const { extracted } = await api.processAnnouncement(rawText);
      setExtracted(extracted);
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handlePublish() {
    if (!extracted) return;
    try {
      await api.saveAnnouncement({
        raw_text: rawText,
        title: extracted.title,
        audience: extracted.audience,
        action: extracted.action,
        priority: extracted.priority,
        status: 'ready_to_publish',
      });
      setPublished(true);
    } catch (err) {
      alert(err.message);
    }
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <h2 className="font-semibold text-navy-950">AI Announcement Processor</h2>
      </div>

      <label className="block text-xs font-medium text-gray-500 mb-1.5">Paste Announcement / Upload PDF</label>
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={4}
        disabled={!isAdmin}
        className="w-full text-xs rounded-lg border border-gray-200 px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
      />

      <button
        onClick={handleProcess}
        disabled={processing || !isAdmin}
        className="w-full text-xs font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg py-2.5 flex items-center justify-center gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {processing ? 'Processing...' : 'Process with AI'}
      </button>
      {!isAdmin && (
        <p className="text-[11px] text-gray-400 mt-2">
          This tool is available to admin accounts. Sign in as admin@mountcarmel.edu to try it.
        </p>
      )}

      {extracted && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-navy-950">Extracted Action</p>
            {published ? (
              <span className="flex items-center gap-1 text-[11px] text-today-600 font-medium">
                <Check className="h-3.5 w-3.5" /> Published
              </span>
            ) : (
              <span className="text-[11px] text-duesoon-600 font-medium">Ready to Publish</span>
            )}
          </div>
          <dl className="text-xs space-y-1.5 mb-3">
            <div className="flex gap-2">
              <dt className="w-16 text-gray-400 shrink-0">Title</dt>
              <dd className="text-navy-950">{extracted.title}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 text-gray-400 shrink-0">Who</dt>
              <dd className="text-navy-950">{extracted.audience}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 text-gray-400 shrink-0">Action</dt>
              <dd className="text-navy-950">{extracted.action}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 text-gray-400 shrink-0">Date</dt>
              <dd className="text-navy-950">{extracted.event_date_text || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 text-gray-400 shrink-0">Priority</dt>
              <dd className="text-navy-950">{extracted.priority}</dd>
            </div>
          </dl>
          <button
            onClick={handlePublish}
            disabled={published}
            className="w-full text-xs font-medium bg-today-500 hover:bg-today-600 disabled:opacity-50 text-white rounded-lg py-2"
          >
            {published ? 'Published' : 'Publish Announcement'}
          </button>
        </div>
      )}
    </div>
  );
}
