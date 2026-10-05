// AI tool definitions for the Pulse AI agent loop.
// Each tool: { name, description, parameters (JSON schema), roles, run(ctx, args) }
// ctx = { userId, role, universityId, pool }
// Every query is scoped to ctx.userId / ctx.universityId. No cross-user data.

const { getPagesForRole } = require('./pageRegistry');

// ── Student: attendance ───────────────────────────────────────────────────────

const get_student_attendance = {
  name: 'get_student_attendance',
  description: "Get the student's attendance summary across all enrolled subjects — conducted, present, absent, and percentage per subject, plus overall percentage and at-risk subjects.",
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student'],
  async run({ userId, pool }) {
    const { rows: csRows } = await pool.query(
      `SELECT cs.id AS class_student_id, cs.class_id, c.subject_name, c.attendance_type
       FROM class_students cs JOIN classes c ON c.id = cs.class_id
       WHERE cs.student_id = $1 ORDER BY c.subject_name ASC`,
      [userId]
    );
    if (!csRows.length) return { found: false, message: 'No attendance records found. You may not be enrolled in any classes yet.' };

    const subjects = [];
    let totalConducted = 0, totalPresent = 0;
    for (const cs of csRows) {
      const { rows } = await pool.query(
        `SELECT status FROM attendance_records WHERE class_id=$1 AND class_student_id=$2`,
        [cs.class_id, cs.class_student_id]
      );
      const conducted = rows.length;
      const present = rows.filter((r) => ['present', 'late'].includes(r.status)).length;
      const cl = rows.filter((r) => r.status === 'cl').length;
      const absent = rows.filter((r) => r.status === 'absent').length;
      const pct = conducted > 0 ? Math.round(((present + cl) / conducted) * 10000) / 100 : null;
      totalConducted += conducted;
      totalPresent += present + cl;
      subjects.push({ subject: cs.subject_name, conducted, present: present + cl, absent, pct, below_75: pct != null && pct < 75 });
    }
    const overall_pct = totalConducted > 0 ? Math.round((totalPresent / totalConducted) * 10000) / 100 : null;
    const at_risk = subjects.filter((s) => s.below_75);
    return { found: true, subjects, total_conducted: totalConducted, total_present: totalPresent, overall_pct, at_risk_count: at_risk.length, at_risk_subjects: at_risk.map((s) => s.subject) };
  },
};

const get_student_attendance_by_subject = {
  name: 'get_student_attendance_by_subject',
  description: "Get the student's attendance for a specific subject by name (partial match). Use this for follow-up questions like 'what about Marketing Management?'",
  parameters: { type: 'object', properties: { subject: { type: 'string', description: 'Subject name (partial match ok)' } }, required: ['subject'] },
  roles: ['student'],
  async run({ userId, pool }, { subject }) {
    const q = `%${(subject || '').toLowerCase()}%`;
    const { rows: csRows } = await pool.query(
      `SELECT cs.id AS class_student_id, cs.class_id, c.subject_name
       FROM class_students cs JOIN classes c ON c.id = cs.class_id
       WHERE cs.student_id = $1 AND LOWER(c.subject_name) LIKE $2 LIMIT 1`,
      [userId, q]
    );
    if (!csRows.length) return { found: false, message: `No subject matching "${subject}" found in your enrolled classes.` };
    const cs = csRows[0];
    const { rows } = await pool.query(
      `SELECT status FROM attendance_records WHERE class_id=$1 AND class_student_id=$2`,
      [cs.class_id, cs.class_student_id]
    );
    const conducted = rows.length;
    const present = rows.filter((r) => ['present', 'late', 'cl'].includes(r.status)).length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    const pct = conducted > 0 ? Math.round((present / conducted) * 10000) / 100 : null;
    return { found: true, subject: cs.subject_name, conducted, present, absent, pct, below_75: pct != null && pct < 75 };
  },
};

// ── Student: schedule & timetable ─────────────────────────────────────────────

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
  description: "Get all events for the student this week (exams, assignments, classes, etc.).",
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

const get_timetable = {
  name: 'get_timetable',
  description: "Get the student's enrolled classes and their schedule.",
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student'],
  async run({ userId, pool }) {
    const { rows: classes } = await pool.query(
      `SELECT c.subject_name, c.program, c.section, c.semester, cs.roll_no
       FROM class_students cs JOIN classes c ON c.id = cs.class_id
       WHERE cs.student_id = $1 ORDER BY c.subject_name ASC`,
      [userId]
    );
    const { rows: upcoming } = await pool.query(
      `SELECT title, event_type, starts_at, ends_at, location FROM events
       WHERE user_id = $1 AND event_type = 'class' AND starts_at >= now()
       ORDER BY starts_at ASC LIMIT 5`,
      [userId]
    );
    return { enrolled_classes: classes, upcoming_classes: upcoming };
  },
};

// ── Student: internships ──────────────────────────────────────────────────────

const get_internship_opportunities = {
  name: 'get_internship_opportunities',
  description: 'Get internship opportunities available to the student, with match scores if they have a CV.',
  parameters: { type: 'object', properties: { limit: { type: 'integer', description: 'Max results, default 5' } }, required: [] },
  roles: ['student'],
  async run({ userId, pool }, { limit = 5 }) {
    const { rows } = await pool.query(
      `SELECT i.company_name, i.role_title, i.location, i.work_mode,
              i.stipend_amount, i.stipend_currency, i.application_deadline,
              ia.match_score, ia.match_reason, ia.status AS application_status
       FROM internships i
       JOIN internship_applications ia ON ia.internship_id = i.id
       WHERE ia.user_id = $1 AND i.published = true AND i.taken_down = false
         AND (i.application_deadline IS NULL OR i.application_deadline >= CURRENT_DATE)
       ORDER BY ia.match_score DESC NULLS LAST, i.application_deadline ASC NULLS LAST
       LIMIT $2`,
      [userId, Math.min(limit, 20)]
    );
    return { internships: rows, count: rows.length };
  },
};

const get_internship_matches = {
  name: 'get_internship_matches',
  description: 'Get the top internship matches for the student with match scores.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT i.company_name, i.role_title, i.location, ia.match_score, ia.status AS application_status
       FROM internships i JOIN internship_applications ia ON ia.internship_id = i.id
       WHERE ia.user_id = $1 AND i.published = true AND i.taken_down = false
       ORDER BY ia.match_score DESC NULLS LAST LIMIT 5`,
      [userId]
    );
    return { matches: rows };
  },
};

const get_cv_summary = {
  name: 'get_cv_summary',
  description: "Get a summary of the student's CV — their active CV type, key skills, education, and whether their CV is set up for internship matching.",
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student'],
  async run({ userId, pool }) {
    const { rows: resumeRows } = await pool.query(
      `SELECT file_url, original_filename, active_cv_source, updated_at FROM student_resumes WHERE user_id = $1`,
      [userId]
    );
    const { rows: profileRows } = await pool.query(
      `SELECT target_role, sections, personal_info, structured_cv FROM cv_profiles WHERE user_id = $1`,
      [userId]
    );
    const resume = resumeRows[0] || null;
    const profile = profileRows[0] || null;

    const has_cv = !!resume;
    const active_source = resume?.active_cv_source || null;
    const is_built = active_source === 'built';
    const is_uploaded = active_source === 'uploaded';

    let skills = [];
    let target_role = profile?.target_role || null;
    if (is_built && profile?.structured_cv?.skills) {
      const raw = profile.structured_cv.skills;
      skills = typeof raw === 'string' ? raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 8) : [];
    }

    return {
      has_cv,
      active_source,
      uploaded_filename: is_uploaded && resume.file_url !== 'built' ? resume.original_filename : null,
      is_built_cv: is_built,
      target_role,
      skills,
      cv_updated_at: resume?.updated_at || null,
    };
  },
};

// ── Student: queries ──────────────────────────────────────────────────────────

const get_my_student_queries = {
  name: 'get_my_student_queries',
  description: "Get the student's own submitted queries and whether they have been answered by the teacher.",
  parameters: { type: 'object', properties: { limit: { type: 'integer', description: 'Max results, default 5' } }, required: [] },
  roles: ['student'],
  async run({ userId, pool }, { limit = 5 }) {
    const { rows } = await pool.query(
      `SELECT sq.subject, sq.message, sq.reply, sq.answered, sq.created_at,
              u.full_name AS teacher_name, c.subject_name AS class_subject
       FROM student_queries sq
       LEFT JOIN users u ON u.id = sq.admin_id
       LEFT JOIN classes c ON c.id = sq.class_id
       WHERE sq.student_id = $1
       ORDER BY sq.created_at DESC LIMIT $2`,
      [userId, Math.min(limit, 10)]
    );
    const answered = rows.filter(r => r.answered);
    const pending = rows.filter(r => !r.answered);
    return { queries: rows, answered_count: answered.length, pending_count: pending.length };
  },
};

// ── Shared: notifications & announcements ─────────────────────────────────────

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
  description: 'Get recently published announcements for this university.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['student', 'admin'],
  async run({ universityId, pool }) {
    const { rows } = await pool.query(
      `SELECT title, body, published_at, audience FROM announcements
       WHERE university_id = $1 AND status = 'published'
       ORDER BY published_at DESC LIMIT 5`,
      [universityId]
    );
    return { announcements: rows };
  },
};

// ── Shared: calendar events (university-wide) ─────────────────────────────────

const get_upcoming_calendar_events = {
  name: 'get_upcoming_calendar_events',
  description: "Get upcoming university-wide calendar events (exams, holidays, deadlines) for the next 14 days.",
  parameters: { type: 'object', properties: { days: { type: 'integer', description: 'Days ahead to look, default 14' } }, required: [] },
  roles: ['student', 'admin'],
  async run({ universityId, userId, role, pool }, { days = 14 }) {
    const { rows } = await pool.query(
      `SELECT title, event_type, event_date, start_time, end_time, description, audience
       FROM calendar_events
       WHERE university_id = $1 AND published = true
         AND event_date >= CURRENT_DATE AND event_date <= CURRENT_DATE + $2
       ORDER BY event_date ASC, start_time ASC NULLS LAST
       LIMIT 10`,
      [universityId, Math.min(days, 30)]
    );
    return { events: rows, count: rows.length };
  },
};

// ── Shared: documents & seating ───────────────────────────────────────────────

const search_documents = {
  name: 'search_documents',
  description: 'Search for documents by keyword, scoped to the user\'s university.',
  parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search term' } }, required: ['query'] },
  roles: ['student', 'admin'],
  async run({ universityId, pool }, { query }) {
    const q = `%${(query || '').toLowerCase()}%`;
    const { rows } = await pool.query(
      `SELECT title, category, file_url FROM documents
       WHERE university_id = $1 AND taken_down = false AND (title ILIKE $2 OR category ILIKE $2)
       ORDER BY created_at DESC LIMIT 5`,
      [universityId, q]
    );
    return { documents: rows };
  },
};

const get_seating = {
  name: 'get_seating',
  description: 'Get the exam seating plan. Students: returns their seat(s). Admins: returns invigilation duties.',
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
  description: 'Get open (unanswered) student queries assigned to this admin/teacher.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['admin'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT sq.subject, sq.message, sq.created_at, u.full_name AS student_name
       FROM student_queries sq LEFT JOIN users u ON u.id = sq.student_id
       WHERE (sq.admin_id = $1 OR sq.admin_id IS NULL) AND sq.answered = false
       ORDER BY sq.created_at DESC LIMIT 10`,
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
  description: 'Get the classes taught by this admin/teacher with student counts.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['admin'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT c.id, c.subject_name, c.section, c.program, c.semester,
              (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS student_count
       FROM classes c WHERE c.teacher_id = $1 ORDER BY c.subject_name ASC`,
      [userId]
    );
    return { classes: rows };
  },
};

const get_upcoming_events = {
  name: 'get_upcoming_events',
  description: 'Get upcoming personal events for the admin.',
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

const get_admin_class_attendance_summary = {
  name: 'get_admin_class_attendance_summary',
  description: 'Get attendance summary for all classes taught by this admin/teacher.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['admin'],
  async run({ userId, pool }) {
    const { rows } = await pool.query(
      `SELECT c.id, c.subject_name, c.program, c.section, c.semester,
              (SELECT COUNT(DISTINCT ar.attendance_date) FROM attendance_records ar WHERE ar.class_id = c.id) AS sessions_conducted,
              (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS total_students
       FROM classes c WHERE c.teacher_id = $1 ORDER BY c.subject_name`,
      [userId]
    );
    return { classes: rows };
  },
};

const get_admin_internship_summary = {
  name: 'get_admin_internship_summary',
  description: 'Get a summary of internship listings for this university, including application counts.',
  parameters: { type: 'object', properties: {}, required: [] },
  roles: ['admin'],
  async run({ userId, universityId, pool }) {
    const { rows } = await pool.query(
      `SELECT i.company_name, i.role_title, i.published, i.taken_down,
              i.application_deadline,
              (SELECT COUNT(*) FROM internship_applications ia WHERE ia.internship_id = i.id AND ia.status != 'suggested') AS applicant_count
       FROM internships i WHERE i.university_id = $1
       ORDER BY i.created_at DESC LIMIT 10`,
      [universityId]
    );
    return { internships: rows, total: rows.length };
  },
};

// ── Navigation tools ──────────────────────────────────────────────────────────

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
      for (const w of words) { if (searchText.includes(w)) score++; }
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
  // Student: attendance
  get_student_attendance,
  get_student_attendance_by_subject,
  // Student: schedule
  get_next_exam,
  get_upcoming_assignments,
  get_events_this_week,
  get_timetable,
  // Student: internships & CV
  get_internship_opportunities,
  get_internship_matches,
  get_cv_summary,
  // Student: queries
  get_my_student_queries,
  // Shared
  get_unread_notifications,
  get_recent_announcements,
  get_upcoming_calendar_events,
  search_documents,
  get_seating,
  find_page,
  navigate_to,
  // Admin
  get_pending_tasks,
  get_open_student_queries,
  get_student_query_summary,
  get_my_classes,
  get_upcoming_events,
  get_admin_class_attendance_summary,
  get_admin_internship_summary,
];

function getToolsForRole(role) {
  return ALL_TOOLS.filter((t) => t.roles.includes(role));
}

function getTool(name) {
  return ALL_TOOLS.find((t) => t.name === name) || null;
}

module.exports = { getToolsForRole, getTool, ALL_TOOLS };
