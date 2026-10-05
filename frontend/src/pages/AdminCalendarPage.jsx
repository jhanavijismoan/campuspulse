import { useEffect, useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Calendar, MapPin, Clock } from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const EVENT_TYPES = ['general', 'exam', 'holiday', 'event', 'deadline'];
const TYPE_COLOR = {
  exam: 'bg-urgent-50 text-urgent-600',
  holiday: 'bg-today-50 text-today-600',
  event: 'bg-blue-50 text-blue-600',
  deadline: 'bg-duesoon-50 text-duesoon-600',
  general: 'bg-gray-100 text-gray-600',
};

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EventForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    event_type: initial?.event_type || 'general',
    event_date: initial?.event_date?.slice(0, 10) || '',
    start_time: initial?.start_time || '',
    end_time: initial?.end_time || '',
    location: initial?.location || '',
    audience: initial?.audience || '',
    published: initial?.published ?? false,
    notify_students: initial?.notify_students ?? false,
  });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Event title" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
      <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description (optional)" rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none" />
      <div className="grid grid-cols-2 gap-3">
        <select value={form.event_type} onChange={(e) => set('event_type', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <input type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} placeholder="Start time" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} placeholder="End time" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Location (optional)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      <select value={form.audience} onChange={(e) => set('audience', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
        <option value="">All Students</option>
        <option value="I BBA">I Year BBA</option>
        <option value="II BBA">II Year BBA</option>
        <option value="III BBA">III Year BBA</option>
        <option value="I BCom">I Year BCom</option>
        <option value="II BCom">II Year BCom</option>
        <option value="BBA Section A">BBA Section A</option>
        <option value="BBA Section B">BBA Section B</option>
        <option value="BBA Section C">BBA Section C</option>
      </select>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} className="rounded" />
          Publish immediately
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.notify_students} onChange={(e) => set('notify_students', e.target.checked)} className="rounded" />
          Notify students
        </label>
      </div>
      <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5">
        {saving ? 'Saving…' : 'Save Event'}
      </button>
    </form>
  );
}

export default function AdminCalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.calendarEvents().then(setEvents).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(form) {
    setSaving(true);
    try {
      await api.createCalendarEvent(form);
      setCreateOpen(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleEdit(form) {
    setSaving(true);
    try {
      await api.updateCalendarEvent(editingEvent.id, form);
      setEditingEvent(null);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(ev) {
    if (!window.confirm(`Delete "${ev.title}"?`)) return;
    await api.deleteCalendarEvent(ev.id);
    load();
  }

  async function togglePublish(ev) {
    if (ev.published) {
      await api.unpublishCalendarEvent(ev.id);
    } else {
      await api.publishCalendarEvent(ev.id);
    }
    load();
  }

  const upcoming = events.filter((e) => new Date(e.event_date) >= new Date(new Date().toDateString()));
  const past = events.filter((e) => new Date(e.event_date) < new Date(new Date().toDateString()));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">Calendar Events</h1>
          <p className="text-sm text-gray-500 mt-1">Broadcast events to students (exams, holidays, deadlines).</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Event
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-10 text-center">Loading...</p>
      ) : (
        <>
          {[{ label: 'Upcoming', list: upcoming }, { label: 'Past', list: past }].map(({ label, list }) =>
            list.length > 0 && (
              <div key={label} className="card rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-sm font-semibold text-gray-600">{label}</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {list.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-4 p-4">
                      <div className="shrink-0 text-center w-12">
                        <p className="text-xl font-bold text-navy-950 leading-none">{new Date(ev.event_date).getDate()}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{new Date(ev.event_date).toLocaleString('en-IN', { month: 'short' })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-navy-950 text-sm">{ev.title}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[ev.event_type]}`}>{ev.event_type}</span>
                          {!ev.published && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Draft</span>}
                        </div>
                        {ev.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ev.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                          {ev.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}</span>}
                          {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
                          {ev.audience && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{ev.audience}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 flex gap-1">
                        <button onClick={() => togglePublish(ev)} className="p-1.5 rounded hover:bg-gray-50" title={ev.published ? 'Unpublish' : 'Publish'}>
                          {ev.published ? <Eye className="h-3.5 w-3.5 text-today-500" /> : <EyeOff className="h-3.5 w-3.5 text-gray-400" />}
                        </button>
                        <button onClick={() => setEditingEvent(ev)} className="p-1.5 rounded hover:bg-gray-50 text-xs text-gray-500">Edit</button>
                        <button onClick={() => handleDelete(ev)} className="p-1.5 rounded hover:bg-gray-50">
                          <Trash2 className="h-3.5 w-3.5 text-urgent-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
          {events.length === 0 && (
            <div className="card p-10 text-center text-gray-400 text-sm">No calendar events yet. Create the first one!</div>
          )}
        </>
      )}

      {createOpen && (
        <Modal title="New Calendar Event" onClose={() => setCreateOpen(false)}>
          <EventForm onSave={handleCreate} onClose={() => setCreateOpen(false)} saving={saving} />
        </Modal>
      )}

      {editingEvent && (
        <Modal title="Edit Event" onClose={() => setEditingEvent(null)}>
          <EventForm initial={editingEvent} onSave={handleEdit} onClose={() => setEditingEvent(null)} saving={saving} />
        </Modal>
      )}
    </div>
  );
}
