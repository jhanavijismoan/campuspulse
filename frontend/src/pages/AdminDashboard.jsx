import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, CalendarDays, CheckSquare, ClipboardList, FileText, Megaphone, MessageCircle,
  Plus, Send, Trash2, Upload, Users,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PulseAI from '../components/PulseAI';
import NotificationsPanel from '../components/NotificationsPanel';
import Modal from '../components/Modal';

const STATUS_LABEL = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
  ready_to_publish: 'Published',
};

const STATUS_CLASS = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-50 text-blue-600',
  published: 'bg-today-50 text-today-600',
  archived: 'bg-gray-100 text-gray-400',
  ready_to_publish: 'bg-today-50 text-today-600',
};

const PRIORITY_CLASS = {
  High: 'bg-urgent-50 text-urgent-600',
  Medium: 'bg-duesoon-50 text-duesoon-600',
  Low: 'bg-today-50 text-today-600',
};

function todayRange() {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  return { from: iso, to: iso };
}

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [queries, setQueries] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [internships, setInternships] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('all');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { from, to } = todayRange();
    const [classRows, announcementRows, taskRows, queryRows, documentRows, internshipRows, scheduleRows, notificationRows] = await Promise.all([
      api.classes().catch(() => []),
      api.announcements().catch(() => []),
      api.pendingTasks().catch(() => []),
      api.studentQueries().catch(() => []),
      api.documents().catch(() => []),
      api.internships().catch(() => []),
      api.events(from, to).catch(() => []),
      api.notifications().catch(() => []),
    ]);
    setClasses(classRows);
    setAnnouncements(announcementRows);
    setTasks(taskRows);
    setQueries(queryRows);
    setDocuments(documentRows);
    setInternships(internshipRows);
    setSchedule(scheduleRows);
    setNotifications(notificationRows);
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

  const visibleAnnouncements = tab === 'all'
    ? announcements
    : announcements.filter((a) => (tab === 'published' ? ['published', 'ready_to_publish'].includes(a.status) : a.status === tab));

  const openTasks = tasks.filter((t) => !t.completed);
  const openQueries = queries.filter((q) => !q.answered);
  const nextMeeting = schedule.find((e) => e.event_type === 'meeting');

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
    setModal(null);
    load();
  }

  async function createDocument(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.uploadDocument({
      title: form.get('title'),
      category: form.get('category'),
      audience: form.get('audience'),
      file: form.get('file')?.size ? form.get('file') : null,
    });
    setModal(null);
    load();
  }

  async function createInternship(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.createInternship({
      company_name: form.get('company_name'),
      role_title: form.get('role_title'),
      location: form.get('location'),
      work_mode: form.get('work_mode'),
      stipend_text: form.get('stipend_text'),
      stipend_amount: form.get('stipend_amount') ? Number(form.get('stipend_amount')) : null,
      duration: form.get('duration'),
      application_deadline: form.get('application_deadline') || null,
      description: form.get('description'),
      requirements: form.get('requirements'),
      tags: form.get('tags').split(',').map((t) => t.trim()).filter(Boolean),
    });
    setModal(null);
    load();
  }

  if (loading) return <div className="text-sm text-gray-400 py-20 text-center">Loading admin dashboard...</div>;

  const statCards = [
    { label: 'Classes Assigned', value: classes.length, sub: '3 UG - 2 PG', icon: Users, color: 'bg-brand-600', link: '/classes', action: 'View Classes' },
    { label: 'Announcements', value: announcements.length, sub: `${counts.draft} Draft - ${counts.scheduled} Scheduled - ${counts.published} Published`, icon: Megaphone, color: 'bg-today-600', link: '/announcements', action: 'Manage Announcements' },
    { label: 'Pending Tasks', value: openTasks.length, sub: 'Assignments / Approvals / Evaluations', icon: ClipboardList, color: 'bg-duesoon-500', link: '/tasks', action: 'View Tasks' },
    { label: 'Student Queries', value: openQueries.length, sub: 'Awaiting Response', icon: MessageCircle, color: 'bg-blue-600', link: '/student-queries', action: 'View Queries' },
    { label: 'Meetings Today', value: schedule.filter((e) => e.event_type === 'meeting').length, sub: `Next: ${nextMeeting ? fmtTime(nextMeeting.starts_at) : 'None'}`, icon: CalendarDays, color: 'bg-brand-600', link: '/calendar', action: 'View Calendar' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">Good afternoon, {user?.full_name?.split(' ')[1] || user?.full_name}</h1>
        <p className="text-sm text-gray-500 mt-1">Here is an overview of your teaching activities and updates.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {statCards.map(({ label, value, sub, icon: Icon, color, link, action }) => (
              <Link key={label} to={link} className="card rounded-xl p-4 flex flex-col justify-between hover:border-brand-200 transition">
                <div>
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full ${color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-navy-950 leading-none">{value}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-navy-950 leading-snug">{label}</p>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{sub}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-brand-600 mt-3">{action} {'->'}</p>
              </Link>
            ))}
          </div>

          <section id="announcements" className="card rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-brand-600" />
                <h2 className="font-semibold text-navy-950">Announcements</h2>
              </div>
              <button onClick={() => setModal('announcement')} className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create Announcement
              </button>
            </div>
            <div className="flex gap-5 border-b border-gray-100 mb-3 overflow-x-auto">
              {['all', 'draft', 'scheduled', 'published', 'archived'].map((key) => (
                <button key={key} onClick={() => setTab(key)} className={`text-xs font-semibold pb-2 capitalize border-b-2 ${tab === key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500'}`}>
                  {key} ({counts[key]})
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs table-fixed">
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="text-gray-500">
                  <tr className="border-b border-gray-100">
                    <th className="py-3 font-semibold">Title</th>
                    <th className="py-3 font-semibold">Audience</th>
                    <th className="py-3 font-semibold">Status</th>
                    <th className="py-3 font-semibold">Scheduled / Date</th>
                    <th className="py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAnnouncements.slice(0, 6).map((a) => (
                    <tr key={a.id} className="border-b border-gray-50">
                      <td className="py-3 pr-2">
                        <p className="font-semibold text-navy-950 truncate">{a.title}</p>
                        <p className="text-gray-400 mt-0.5 truncate">{a.body || a.action}</p>
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
                  {!visibleAnnouncements.length && (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">No announcements in this tab.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Link to="/announcements" className="mt-3 inline-flex text-xs font-semibold text-brand-600">View All Announcements {'->'}</Link>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <section id="classes" className="card rounded-lg p-5 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-navy-950">My Classes</h2>
                <Link to="/classes" className="text-xs font-semibold text-brand-600 shrink-0">View All</Link>
              </div>
              <div className="space-y-1 text-xs">
                {classes.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/classes/${c.id}/attendance`)}
                    className="w-full flex items-center justify-between gap-2 text-left hover:bg-gray-50 rounded-lg px-1.5 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-navy-950 block truncate">{c.subject_name}</span>
                      <span className="text-gray-400 block truncate">{c.program} &middot; Sec {c.section}</span>
                    </span>
                    <span className="shrink-0 text-navy-950 font-semibold">{c.student_count}</span>
                  </button>
                ))}
                <div className="flex justify-between border-t border-gray-100 pt-3 mt-2 font-bold text-navy-950">
                  <span>Total Students</span>
                  <span className="text-brand-600">{classes.reduce((sum, c) => sum + Number(c.student_count || 0), 0)}</span>
                </div>
              </div>
            </section>

            <section id="tasks" className="card rounded-lg p-5 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-navy-950">Pending Tasks</h2>
                <Link to="/tasks" className="text-xs font-semibold text-brand-600 shrink-0">View All</Link>
              </div>
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <label key={task.id} className="flex items-start gap-2 text-xs">
                    <input type="checkbox" checked={task.completed} onChange={() => api.updatePendingTask(task.id, { completed: !task.completed }).then(load)} className="mt-1 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="font-semibold text-navy-950 block truncate">{task.title}</span>
                      <span className="text-gray-400 block truncate">{task.section || task.subject_name} {task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}</span>
                    </span>
                    <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-semibold ${PRIORITY_CLASS[task.priority]}`}>{task.priority}</span>
                  </label>
                ))}
                {!tasks.length && <p className="text-xs text-gray-400">No pending tasks.</p>}
              </div>
            </section>

            <section className="card rounded-lg p-5 min-w-0">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="font-semibold text-navy-950">Documents & Resources</h2>
                <button onClick={() => setModal('document')} className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 flex items-center gap-1 shrink-0">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
              </div>
              <div className="space-y-3">
                {documents.slice(0, 5).map((doc) => (
                  <a key={doc.id} href={doc.file_url} download className="flex items-center gap-3 text-xs hover:bg-gray-50 rounded-lg -mx-1.5 px-1.5 py-1">
                    <FileText className="h-4 w-4 text-brand-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy-950 truncate">{doc.title}</p>
                      <p className="text-gray-400 truncate">{doc.audience || doc.category}</p>
                    </div>
                  </a>
                ))}
                {!documents.length && <p className="text-xs text-gray-400">No documents yet.</p>}
              </div>
              <Link to="/documents" className="mt-3 inline-flex text-xs font-semibold text-brand-600">View All Documents {'->'}</Link>
            </section>
          </div>

          <section className="card rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h2 className="font-semibold text-navy-950">Internship Opportunities</h2>
              <div className="flex items-center gap-3 shrink-0">
                <Link to="/internships" className="text-xs font-semibold text-brand-600">View All</Link>
                <button onClick={() => setModal('internship')} className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Internship
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {internships.slice(0, 3).map((internship) => (
                <div key={internship.id} className="border border-gray-100 rounded-lg p-4 min-w-0">
                  <p className="font-semibold text-sm text-navy-950 truncate">{internship.company_name}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{internship.role_title}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate">{internship.location} - {internship.work_mode}</p>
                </div>
              ))}
              {!internships.length && <p className="text-xs text-gray-400 md:col-span-3">No internships posted yet.</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <PulseAI compact />
          <NotificationsPanel items={notifications} />
          <section className="card rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-navy-950">Today's Schedule</h2>
              <Link to="/calendar" className="text-xs font-semibold text-brand-600">View Calendar</Link>
            </div>
            <div className="space-y-4">
              {schedule.map((event) => (
                <div key={event.id} className="flex gap-3 text-xs">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-600 shrink-0" />
                  <div className="w-20 text-navy-950 font-semibold">{fmtTime(event.starts_at)} - {fmtTime(event.ends_at)}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-navy-950">{event.title}</p>
                    <p className="text-gray-400">{event.description}</p>
                    <p className="text-gray-400">{event.location}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/calendar" className="mt-4 inline-flex text-xs font-semibold text-brand-600">View Full Calendar {'->'}</Link>
          </section>
          <section className="card rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-4 w-4 text-brand-600" />
              <h2 className="font-semibold text-navy-950">Student Queries</h2>
            </div>
            <div className="space-y-3">
              {openQueries.slice(0, 4).map((query) => (
                <div key={query.id} className="text-xs border-b border-gray-50 pb-3 last:border-0">
                  <p className="font-semibold text-navy-950">{query.subject}</p>
                  <p className="text-gray-500">{query.student_name}</p>
                  <button onClick={() => api.updateStudentQuery(query.id, { answered: true }).then(load)} className="mt-2 text-brand-600 font-semibold flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5" /> Mark answered
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {modal === 'announcement' && (
        <Modal title="Create Announcement" onClose={() => setModal(null)}>
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

      {modal === 'document' && (
        <Modal title="Upload Document" onClose={() => setModal(null)}>
          <form onSubmit={createDocument} className="space-y-3">
            <input name="title" placeholder="Document title" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
            <input name="category" placeholder="Category (e.g. Study Material, Form)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input name="audience" placeholder="Section / audience" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">File (optional — a placeholder is generated if left empty)</label>
              <input name="file" type="file" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:text-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold" />
            </div>
            <button className="w-full rounded-lg bg-brand-600 text-white text-sm font-semibold py-2.5">Upload Document</button>
          </form>
        </Modal>
      )}

      {modal === 'internship' && (
        <Modal title="Add Internship" onClose={() => setModal(null)} wide>
          <form onSubmit={createInternship} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input name="company_name" placeholder="Company" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
              <input name="role_title" placeholder="Role" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input name="location" placeholder="Location" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <select name="work_mode" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"><option>Hybrid</option><option>Remote</option><option>On-site</option></select>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <input name="stipend_text" placeholder="Stipend (display), e.g. ₹15,000/mo" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input name="stipend_amount" type="number" placeholder="Stipend amount (for sorting)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input name="duration" placeholder="Duration, e.g. 3 months" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Application deadline (last date to apply)</label>
              <input name="application_deadline" type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <textarea name="description" placeholder="Job description — what will they be doing?" rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <textarea name="requirements" placeholder="Requirements — skills, year of study, etc." rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input name="tags" placeholder="Tags, comma separated (e.g. Marketing, Excel, Social Media)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <button className="w-full rounded-lg bg-brand-600 text-white text-sm font-semibold py-2.5">Add Opportunity</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
