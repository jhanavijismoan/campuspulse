require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const eventsRoutes = require('./routes/events');
const notificationsRoutes = require('./routes/notifications');
const internshipsRoutes = require('./routes/internships');
const documentsRoutes = require('./routes/documents');
const announcementsRoutes = require('./routes/announcements');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const classesRoutes = require('./routes/classes');
const pendingTasksRoutes = require('./routes/pendingTasks');
const studentQueriesRoutes = require('./routes/studentQueries');
const cvRoutes = require('./routes/cv');
const resumeRoutes = require('./routes/resume');
const seatingRoutes = require('./routes/seating');
const searchRoutes = require('./routes/search');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP off — frontend served separately

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : null; // null = allow any origin during dev (no CLIENT_ORIGIN set)

app.use(cors({
  origin: allowedOrigins || true, // true reflects request origin (dev-safe, not `*`)
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// ── Auth-gated static file serving ───────────────────────────────────────────
// JWT can arrive as Bearer header OR ?token= query param (for <a href> direct links)
function jwtFromRequest(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.query.token || null;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// /resumes/:filename — only the owning student or any admin
app.use('/resumes', (req, res, next) => {
  const token = jwtFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const filename = req.path.replace(/^\//, '');
  // Files are named resume-{userId}-{timestamp}.ext — check ownership
  const ownerMatch = filename.match(/^resume-(\d+)-/);
  if (payload.role === 'admin' || (ownerMatch && parseInt(ownerMatch[1]) === payload.id)) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
}, express.static(path.join(__dirname, '..', 'public', 'resumes')));

// /files/:filename — any authenticated user
app.use('/files', (req, res, next) => {
  const token = jwtFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  next();
}, express.static(path.join(__dirname, '..', 'public', 'files')));

// ── Rate limiting on auth endpoints ──────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/internships', internshipsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/pending-tasks', pendingTasksRoutes);
app.use('/api/student-queries', studentQueriesRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/seating', seatingRoutes);
app.use('/api/search', searchRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`CampusPulse API running on http://localhost:${PORT}`));
