// AI tool definitions for the Pulse AI agent loop.
// Each tool: { name, description, parameters (JSON schema), roles, run(ctx, args) }
// ctx = { userId, role, universityId, pool }
// Every query is scoped to ctx.userId or the admin's own classes.

const { getPagesForRole } = require('./pageRegistry');

// ── Student tools ─────────────────────────────────────────────────────────────

const get_next_exam = {
  name: 'get_next_exam',
  description: 'Get the next upcoming exam or CIA for the student.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT title, starts_at, location FROM events
       WHERE user_id = $1 AND event_type = 'exam' AND starts_at >= now()
       ORDER BY starts_at ASC LIMIT 1`,
      [userId]
    );
    if (!rows[0]) return { found: false, message: 'No upcoming exams scheduled.' };
    return { found: true, ...rows[0] };
  },
};

const get_upcoming_assignments = {
  name: 'get_upcoming_assignments',
  description: 'Get upcoming assignments due for the student.',
  parameters: { type: 'object', properties: { limit: { type: 'integer', description: 'Max results, default 5' } }, required: [] },
  roles: ['student'],
  async run({ userId, pool }, { limit = 5 }) {
    const { rows } = await pool.query(
      `SELECT title, starts_at FROM events
       WHERE user_id = $1 AND event_type = 'assignment' AND starts_at >= now()
       ORDER BY starts_at ASC LIMIT $2`,
      [userId, Math.min(limit, 10)]
    );
    return { assignments: rows };
  },
};

const get_events_this_week = {
  name: 'get_events_this_week',
  description: 'Get all events for the student this week.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT title, starts_at, event_type, location FROM events
       WHERE user_id = $1 AND starts_at >= date_trunc('week', now()) AND starts_at < date_trunc('week', now()) + interval '7 days'
       ORDER BY starts_at ASC LIMIT 10`,
      [userId]
    );
    return { events: rows };
  },
};

const get_internship_matches = {
  name: 'get_internship_matches',
  description: 'Get the top internship matches for the student.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT i.company_name, i.role_title, ia.match_score
       FROM internships i JOIN internship_applications ia ON ia.internship_id = i.id
       WHERE ia.user_id = $1 ORDER BY ia.match_score DESC LIMIT 5`,
      [userId]
    );
    return { matches: rows };
  },
};

const get_unread_notifications = {
  name: 'get_unread_notifications',
  description: 'Get unread notifications for the current user.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student', 'admin'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT title, body, created_at FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
    return { unread_count: rows.length, notifications: rows };
  },
};

const get_recent_announcements = {
  name: 'get_recent_announcements',
  description: 'Get recently published announcements.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student', 'admin'],
  async run({ pool }) {
    const { rows } = await pool.query(
      `SELECT title, body, published_at FROM announcements WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT 5`
    );
    return { announcements: rows };
  },
};

const search_documents = {
  name: 'search_documents',
  description: 'Search for documents by keyword.',
  parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search term' } }, required: ['query'] },
  roles: ['student', 'admin'],
  async run({ pool }, { query }) {
    const q = `%${(query || '').toLowerCase()}%`;
    const { rows } = await pool.query(
      `SELECT title, category, file_url FROM documents WHERE title ILIKE $1 OR category ILIKE $1 ORDER BY created_at DESC LIMIT 5`,
      [q]
    );
    return { documents: rows };
  },
};

const get_seating = {
  name: 'get_seating',
  description: 'Get the exam seating plan for the current user. For students: returns their seat assignments. For admins: returns their invigilation duties.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student', 'admin'],
  async run({ userId, role, pool }) {
    if (role === 'student') {
      const { rows } = await pool.query(
        `SELECT
           sa.row_number, sa.seat_number, sa.roll_no,
           es.title AS session_title, es.exam_date, es.start_time, es.end_time,
           eh.name AS hall_name
         FROM seat_assignments sa
         JOIN exam_sessions es ON es.id = sa.session_id
         JOIN exam_halls eh ON eh.id = sa.hall_id
         WHERE sa.student_id = $1 AND es.published = true
         ORDER BY es.exam_date ASC LIMIT 5`,
        [userId]
      );
      if (!rows.length) return { available: false, message: 'No seating plan has been published for you yet.' };
      return { available: true, seats: rows };
    }
    // Admin: return invigilation duties
    const { rows } = await pool.query(
      `SELECT id_d.duty_role, es.title AS session_title, es.exam_date, es.start_time, eh.name AS hall_name
       FROM invigilation_duties id_d
       JOIN exam_sessions es ON es.id = id_d.session_id
       JOIN exam_halls eh ON eh.id = id_d.hall_id
       WHERE id_d.admin_id = $1
       ORDER BY es.exam_date ASC LIMIT 5`,
      [userId]
    );
    if (!rows.length) return { available: false, message: 'No invigilation duties assigned yet.' };
    return { available: true, duties: rows };
  },
};

// ── Admin tools ───────────────────────────────────────────────────────────────

const get_pending_tasks = {
  name: 'get_pending_tasks',
  description: 'Get pending tasks for the admin/teacher.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['admin'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT title, due_date, priority FROM pending_tasks WHERE admin_id = $1 AND completed = false ORDER BY due_date ASC LIMIT 10`,
      [userId]
    );
    return { tasks: rows };
  },
};

const get_open_student_queries = {
  name: 'get_open_student_queries',
  description: 'Get open (unanswered) student queries assigned to this admin.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['admin'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT subject, body, created_at FROM student_queries WHERE (admin_id = $1 OR admin_id IS NULL) AND answered = false ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );
    return { open_queries: rows };
  },
};

const get_student_query_summary = {
  name: 'get_student_query_summary',
  description: 'Summarize student queries from the last 7 days grouped by subject.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['admin'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT subject, COUNT(*)::int AS count FROM student_queries
       WHERE (admin_id = $1 OR admin_id IS NULL) AND created_at >= now() - interval '7 days'
       GROUP BY subject ORDER BY count DESC`,
      [userId]
    );
    return { summary: rows };
  },
};

const get_my_classes = {
  name: 'get_my_classes',
  description: 'Get the classes taught by this admin/teacher.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['admin'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT id, name, section, program FROM classes WHERE teacher_id = $1 ORDER BY name ASC`,
      [userId]
    );
    return { classes: rows };
  },
};

const get_upcoming_events = {
  name: 'get_upcoming_events',
  description: 'Get upcoming events for the admin.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['admin'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT title, starts_at, event_type, location FROM events
       WHERE user_id = $1 AND starts_at >= now()
       ORDER BY starts_at ASC LIMIT 5`,
      [userId]
    );
    return { events: rows };
  },
};

// ── Shared navigation tools ───────────────────────────────────────────────────

const find_page = {
  name: 'find_page',
  description: 'Find the best matching dashboard page(s) for a given topic or question.',
  parameters: { type: 'object', properties: { topic: { type: 'string', description: 'Topic or question to match pages for' } }, required: ['topic'] },
  roles: ['student', 'admin'],
  run({ role }, { topic }) {
    const pages = getPagesForRole(role);
    const words = (topic || '').toLowerCase().split(/\s+/).filter(Boolean);
    const scored = pages.map((p) => {
      let score = 0;
      const searchText = `${p.label} ${p.description} ${p.keywords.join(' ')}`.toLowerCase();
      for (const w of words) {
        if (searchText.includes(w)) score++;
      }
      return { ...p, score };
    }).filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    return { pages: scored.map((p) => ({ key: p.key, label: p.label, path: p.path, description: p.description })) };
  },
};

const navigate_to = {
  name: 'navigate_to',
  description: 'Suggest navigating the user to a specific page in the dashboard.',
  parameters: {
    type: 'object',
    properties: {
      page_key: { type: 'string', description: 'The page key from the registry (e.g. "calendar", "documents-student")' },
      label: { type: 'string', description: 'Optional display label for the link button' },
    },
    required: ['page_key'],
  },
  roles: ['student', 'admin'],
  run({ role }, { page_key, label }) {
    const pages = getPagesForRole(role);
    const page = pages.find((p) => p.key === page_key);
    if (!page) return { success: false, error: `Page '${page_key}' not found or not available for role '${role}'` };
    return { success: true, path: page.path, label: label || page.label };
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

const ALL_TOOLS = [
  get_next_exam,
  get_upcoming_assignments,
  get_events_this_week,
  get_internship_matches,
  get_unread_notifications,
  get_recent_announcements,
  search_documents,
  get_seating,
  get_pending_tasks,
  get_open_student_queries,
  get_student_query_summary,
  get_my_classes,
  get_upcoming_events,
  find_page,
  navigate_to,
];

function getToolsForRole(role) {
  return ALL_TOOLS.filter((t) => t.roles.includes(role));
}

function getTool(name) {
  return ALL_TOOLS.find((t) => t.name === name) || null;
}

module.exports = { getToolsForRole, getTool, ALL_TOOLS };
