require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

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

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use('/files', express.static(path.join(__dirname, '..', 'public', 'files')));
app.use('/resumes', express.static(path.join(__dirname, '..', 'public', 'resumes')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
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

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`CampusPulse API running on http://localhost:${PORT}`));
