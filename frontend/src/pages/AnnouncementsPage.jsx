import { useEffect, useMemo, useState } from 'react';
import { Plus, Send, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AnnouncementProcessor from '../components/AnnouncementProcessor';
import Modal from '../components/Modal';

const PRIORITY_CLASS = {
  High: 'bg-urgent-50 text-urgent-600',
  Medium: 'bg-duesoon-50 text-duesoon-600',
  Low: 'bg-today-50 text-today-600',
};

const STATUS_LABEL = { draft: 'Draft', scheduled: 'Scheduled', published: 'Published', archived: 'Archived', ready_to_publish: 'Published' };
const STATUS_CLASS = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-50 text-blue-600',
  published: 'bg-today-50 text-today-600',
  archived: 'bg-gray-100 text-gray-400',
  ready_to_publish: 'bg-today-50 text-today-600',
};

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function AdminAnnouncementsView() {
  const [announcements, setAnnouncements] = useState([]);
  const [tab, setTab] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setAnnouncements(await api.announcements());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => ({
    all: announcements.length,
    draft: announcements.filter((a) => a.status === 'draft').length,
    scheduled: announcements.filter((a) => a.status === 'scheduled').length,
    published: announcements.filter((a) => ['published', 'ready_to_publish'].includes(a.status)).length,
    archived: announcements.filter((a) => a.status === 'archived').length,
  }), [announcements]);

  const visible = tab === 'all'
    ? announcements
    : announcements.filter((a) => (tab === 'published' ? ['published', 'ready_to_publish'].includes(a.status) : a.status === tab));

  async function createAnnouncement(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const status = form.get('schedule_mode') === 'later' ? 'scheduled' : form.get('status');
    await api.saveAnnouncement({
      title: form.get('title'),
      audience: form.get('audience'),
      body: form.get('body'),
      raw_text: form.get('body'),
      priority: form.get('priority'),
      status,
      scheduled_at: form.get('schedule_mode') === 'later' ? form.get('scheduled_at') : null,
    });
    setModalOpen(false);
    load();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">Manage everything you've published to students.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 flex items-center gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Create Announcement
        </button>
      </div>

      <div className="card rounded-lg p-5">
        <div className="flex gap-5 border-b border-gray-100 mb-4 overflow-x-auto">
          {['all', 'draft', 'scheduled', 'published', 'archived'].map((key) => (
            <button key={key} onClick={() => setTab(key)} className={`text-xs font-semibold pb-2 capitalize border-b-2 whitespace-nowrap ${tab === key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500'}`}>
              {key} ({counts[key]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed">
              <colgroup>
                <col className="w-[38%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead className="text-gray-500">
                <tr className="border-b border-gray-100">
                  <th className="py-3 font-semibold">Title &amp; Body</th>
                  <th className="py-3 font-semibold">Audience</th>
                  <th className="py-3 font-semibold">Status</th>
                  <th className="py-3 font-semibold">Scheduled / Date</th>
                  <th className="py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 align-top">
                    <td className="py-3 pr-2">
                      <p className="font-semibold text-navy-950 truncate">{a.title}</p>
                      <p className="text-gray-400 mt-0.5 line-clamp-2">{a.body || a.action}</p>
                    </td>
                    <td className="py-3 pr-2 text-navy-950 truncate">{a.audience}</td>
                    <td className="py-3 pr-2">
                      <span className={`inline-block px-2 py-1 rounded text-[11px] font-semibold whitespace-nowrap ${STATUS_CLASS[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    </td>
                    <td className="py-3 pr-2 text-navy-950 truncate">{fmtDate(a.scheduled_at || a.event_date || a.created_at)}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        {a.status !== 'published' && (
                          <button onClick={() => api.updateAnnouncement(a.id, { status: 'published' }).then(load)} className="p-1.5 rounded hover:bg-gray-50" title="Publish"><Send className="h-3.5 w-3.5" /></button>
                        )}
                        <button onClick={() => api.deleteAnnouncement(a.id).then(load)} className="p-1.5 rounded hover:bg-gray-50" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!visible.length && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No announcements in this tab.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="Create Announcement" onClose={() => setModalOpen(false)}>
          <form onSubmit={createAnnouncement} className="space-y-3">
            <input name="title" placeholder="Title" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
            <input name="audience" placeholder="Audience / target section" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
            <textarea name="body" placeholder="Body text" rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
            <div className="grid grid-cols-2 gap-3">
              <select name="status" className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="published">Publish now</option><option value="draft">Save draft</option></select>
              <select name="priority" className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option>Medium</option><option>High</option><option>Low</option></select>
            </div>
            <select name="schedule_mode" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="now">Now</option><option value="later">Schedule later</option></select>
            <input name="scheduled_at" type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <button className="w-full rounded-lg bg-brand-600 text-white text-sm font-semibold py-2.5">Save Announcement</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StudentAnnouncementsView() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.announcements().then(setAnnouncements).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-navy-950">Announcements</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="card p-5">
          <h2 className="font-semibold text-navy-950 mb-4">Published &amp; Drafted</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="pb-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-navy-950">{a.title}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_CLASS[a.priority] || 'bg-gray-50 text-gray-500'}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{a.audience}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.body || a.action}</p>
                </div>
              ))}
              {!announcements.length && <p className="text-sm text-gray-400">No announcements yet.</p>}
            </div>
          )}
        </div>

        <AnnouncementProcessor />
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminAnnouncementsView /> : <StudentAnnouncementsView />;
}
