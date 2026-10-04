import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const PRIORITY_CLASS = {
  High: 'bg-urgent-50 text-urgent-600',
  Medium: 'bg-duesoon-50 text-duesoon-600',
  Low: 'bg-today-50 text-today-600',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filter, setFilter] = useState('open');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [taskRows, classRows] = await Promise.all([
      api.pendingTasks().catch(() => []),
      api.classes().catch(() => []),
    ]);
    setTasks(taskRows);
    setClasses(classRows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    if (filter === 'open') return tasks.filter((t) => !t.completed);
    if (filter === 'done') return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  async function createTask(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.createPendingTask({
      title: form.get('title'),
      class_id: form.get('class_id') || null,
      due_date: form.get('due_date') || null,
      priority: form.get('priority'),
    });
    setModalOpen(false);
    load();
  }

  async function remove(id) {
    await api.deletePendingTask(id);
    load();
  }

  const openCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">Pending Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Assignments, approvals, and evaluations awaiting your action.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 flex items-center gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> New Task
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'open', label: `Open (${openCount})` },
          { key: 'done', label: 'Completed' },
          { key: 'all', label: 'All' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${filter === f.key ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-200'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card rounded-lg p-5">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading tasks...</p>
        ) : (
          <div className="space-y-1">
            {visible.map((task) => (
              <label key={task.id} className="flex items-start gap-3 text-sm py-3 border-b border-gray-50 last:border-0">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => api.updatePendingTask(task.id, { completed: !task.completed }).then(load)}
                  className="mt-1 shrink-0"
                />
                <span className="flex-1 min-w-0">
                  <span className={`font-semibold block ${task.completed ? 'text-gray-400 line-through' : 'text-navy-950'}`}>{task.title}</span>
                  <span className="text-xs text-gray-400">
                    {task.subject_name ? `${task.subject_name} ${task.section ? `— Sec ${task.section}` : ''}` : 'General'}
                    {task.due_date ? ` · Due ${new Date(task.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                  </span>
                </span>
                <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-semibold ${PRIORITY_CLASS[task.priority] || 'bg-gray-50 text-gray-500'}`}>{task.priority}</span>
                <button onClick={() => remove(task.id)} className="shrink-0 p-1.5 rounded hover:bg-gray-50 text-gray-400" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </label>
            ))}
            {!visible.length && <p className="text-sm text-gray-400 text-center py-8">Nothing here.</p>}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="New Task" onClose={() => setModalOpen(false)}>
          <form onSubmit={createTask} className="space-y-3">
            <input name="title" placeholder="Task title" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
            <select name="class_id" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="">No specific class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.subject_name} — {c.program} {c.section}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input name="due_date" type="date" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <select name="priority" className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option>Medium</option>
                <option>High</option>
                <option>Low</option>
              </select>
            </div>
            <button className="w-full rounded-lg bg-brand-600 text-white text-sm font-semibold py-2.5">Add Task</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
