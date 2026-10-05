// Single source of truth for all navigable pages in CampusPulse.
// enabled: false pages are never returned as navigation targets (reserved for future features).

const PAGES = [
  {
    key: 'dashboard',
    path: '/',
    label: 'Dashboard',
    roles: ['student', 'admin'],
    description: 'Overview of your week, announcements, and activity.',
    keywords: ['home', 'overview', 'summary', 'main'],
    enabled: true,
  },
  {
    key: 'my-week',
    path: '/my-week',
    label: 'My Week',
    roles: ['student'],
    description: 'Your weekly schedule, exams, and deadlines at a glance.',
    keywords: ['week', 'schedule', 'today', 'planner', 'upcoming'],
    enabled: true,
  },
  {
    key: 'calendar',
    path: '/calendar',
    label: 'Calendar',
    roles: ['student', 'admin'],
    description: 'Full calendar view of events, exams, and assignments.',
    keywords: ['calendar', 'exam', 'cia', 'event', 'date', 'seating', 'schedule', 'timetable'],
    enabled: true,
  },
  {
    key: 'internships',
    path: '/internships',
    label: 'Internship Opportunities',
    roles: ['student', 'admin'],
    description: 'Browse and apply to internship opportunities; view AI match scores.',
    keywords: ['internship', 'job', 'placement', 'company', 'apply', 'career', 'opportunity'],
    enabled: true,
  },
  {
    key: 'documents-student',
    path: '/documents',
    label: 'Documents & Forms',
    roles: ['student'],
    description: 'Download hall tickets, blue books, forms, and other academic documents.',
    keywords: ['documents', 'forms', 'hall ticket', 'blue book', 'print', 'download', 'admit card', 'guidelines', 'files'],
    enabled: true,
  },
  {
    key: 'documents-admin',
    path: '/documents',
    label: 'Documents & Resources',
    roles: ['admin'],
    description: 'Upload and manage documents and resources for students.',
    keywords: ['documents', 'resources', 'upload', 'files', 'share', 'blue book'],
    enabled: true,
  },
  {
    key: 'cv-builder',
    path: '/cv-builder',
    label: 'CV Builder',
    roles: ['student'],
    description: 'AI-assisted CV/resume builder for students.',
    keywords: ['cv', 'resume', 'build', 'generate', 'create'],
    enabled: true,
  },
  {
    key: 'pulse-ai',
    path: '/pulse-ai',
    label: 'Pulse AI',
    roles: ['student', 'admin'],
    description: 'Full-page AI assistant for all your college queries.',
    keywords: ['ai', 'assistant', 'chat', 'help', 'ask'],
    enabled: true,
  },
  {
    key: 'notifications',
    path: '/notifications',
    label: 'Notifications',
    roles: ['student', 'admin'],
    description: 'View and manage your notifications.',
    keywords: ['notifications', 'alerts', 'inbox', 'unread'],
    enabled: true,
  },
  {
    key: 'announcements',
    path: '/announcements',
    label: 'Announcements',
    roles: ['student', 'admin'],
    description: 'Published announcements from the university.',
    keywords: ['announcements', 'notice', 'news', 'broadcast', 'message'],
    enabled: true,
  },
  {
    key: 'profile',
    path: '/profile',
    label: 'Profile',
    roles: ['student', 'admin'],
    description: 'Your account profile and settings.',
    keywords: ['profile', 'account', 'settings', 'personal'],
    enabled: true,
  },
  // Admin-only pages
  {
    key: 'classes',
    path: '/classes',
    label: 'My Classes',
    roles: ['admin'],
    description: 'Manage your classes and view rosters.',
    keywords: ['classes', 'students', 'roster', 'section', 'teach'],
    enabled: true,
  },
  {
    key: 'attendance',
    path: '/classes/:id/attendance',
    label: 'Mark Attendance',
    roles: ['admin'],
    description: 'Mark and review attendance for a specific class.',
    keywords: ['attendance', 'present', 'absent', 'mark', 'class'],
    enabled: true,
  },
  {
    key: 'tasks',
    path: '/tasks',
    label: 'Assignments',
    roles: ['admin'],
    description: 'Manage and track pending tasks and assignment deadlines.',
    keywords: ['tasks', 'assignments', 'pending', 'deadline', 'todo', 'due'],
    enabled: true,
  },
  {
    key: 'reports',
    path: '/reports',
    label: 'Reports & Analytics',
    roles: ['admin'],
    description: 'Dashboard analytics, AI query stats, and student activity reports.',
    keywords: ['reports', 'analytics', 'stats', 'data', 'insights'],
    enabled: true,
  },
  {
    key: 'student-queries',
    path: '/student-queries',
    label: 'Student Queries',
    roles: ['admin'],
    description: 'View and respond to student questions and queries.',
    keywords: ['queries', 'questions', 'student', 'help', 'support'],
    enabled: true,
  },
  {
    key: 'seating',
    path: '/seating',
    label: 'Seating Plan',
    roles: ['student', 'admin'],
    description: 'View your exam seat assignment and hall chart. Admins can manage sessions and invigilation duties.',
    keywords: ['seating', 'seat', 'hall', 'exam room', 'where am i sitting', 'cia seat', 'invigilation', 'duty'],
    enabled: true,
  },
];

function getPagesForRole(role) {
  return PAGES.filter((p) => p.enabled && p.roles.includes(role));
}

function isValidPath(path, role) {
  return PAGES.some((p) => p.enabled && p.roles.includes(role) && p.path === path);
}

function resolvePage(key, role) {
  return PAGES.find((p) => p.enabled && p.roles.includes(role) && p.key === key) || null;
}

module.exports = { PAGES, getPagesForRole, isValidPath, resolvePage };
