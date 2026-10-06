# CampusPulse

A full-stack college dashboard: React (Vite + Tailwind) frontend, Express/PostgreSQL backend.
Covers the dashboard highlights, My Week, Calendar, Internship matching, Documents & Forms,
Notifications, an AI Announcement Processor, an AI assistant ("Pulse AI"), and an Admin
Analytics panel — all backed by real data in Postgres, not mock JSON.

## Project layout

```
campuspulse/
  backend/     Express API + PostgreSQL schema & seed data
  frontend/    React (Vite) single-page app
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a connection string to a hosted instance)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env      # then edit DATABASE_URL / JWT_SECRET as needed
```

Create the database and load the schema + all feature migrations:

```bash
createdb campuspulse                      # or: psql -U postgres -c "CREATE DATABASE campuspulse;"
psql -U postgres -d campuspulse -f db/schema.sql
psql -U postgres -d campuspulse -f db/migrate_attendance.sql
psql -U postgres -d campuspulse -f db/migrate_internships.sql
psql -U postgres -d campuspulse -f db/migrate_cv_builder.sql
psql -U postgres -d campuspulse -f db/migrate_timetable.sql
psql -U postgres -d campuspulse -f db/migrate_cia_marks.sql
psql -U postgres -d campuspulse -f db/migrate_ai_queries_unique.sql
```

Seed it with demo data (Mount Carmel University, student Jhanavi, sample exams/assignments/
internships/documents/announcements — all dated relative to "today" so the dashboard always
looks current):

```bash
npm run seed
```

Generate placeholder downloadable files for the Documents & Forms section (optional but
recommended so download links don't 404):

```bash
node db/gen_placeholder_docs.js
```

Start the API:

```bash
npm run dev      # nodemon, auto-restarts on change
# or
npm start        # plain node
```

The API runs on **http://localhost:4000** by default. Health check: `GET /api/health`.

### Demo accounts

| Role    | Email                        | Password    |
|---------|-------------------------------|-------------|
| Student | jhanavi@mountcarmel.edu       | password123 |
| Admin   | admin@mountcarmel.edu         | password123 |

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app runs on **http://localhost:5173** and proxies `/api/*` and `/files/*` requests to the
backend at `localhost:4000` (see `vite.config.js`). If you point the frontend at a different
backend host/port, update that proxy config or set up your own reverse proxy in production.

Log in with either demo account above. The Admin Dashboard (announcements management, class
attendance, pending tasks, document upload, internship posting, admin-flavored Pulse AI) only
renders for the admin account; the student account sees the original student dashboard.

## Admin Dashboard pages

Beyond the main `/` dashboard, admins get dedicated full pages (reachable from sidebar):

- `/classes` — every class, each linking to `/classes/:id/attendance` to mark attendance.
- `/tasks` — full pending-tasks list (assignments/approvals/evaluations), with filtering and a "New Task" form.
- `/reports` — Admin Analytics (engagement stats, upcoming deadlines, top Pulse AI queries).
- `/announcements` — full manage view for admins (tabs, publish/delete, AI-powered create).
- `/student-queries` — all student questions with "AI Draft" reply suggestion and "Send Reply".
- `/quiz-generator` — AI-generated MCQ quiz (subject, topic, count, difficulty) with "Copy all".
- `/seating` — Seating Plan manager (create exam sessions, assign halls, publish; export CSV).

## Student Dashboard pages

- `/attendance` — per-subject ring chart with present/absent count and <75% warning.
- `/timetable` — weekly timetable (day tabs, Mon–Fri) based on enrolled classes.
- `/cia-marks` — CIA 1 / CIA 2 / Assignment marks per subject with colour coding.
- `/student-queries` — "Ask a Teacher" form + replies thread; green border = answered.
- `/cv-builder` — multi-section CV wizard with AI generation and Print/Save as PDF.
- `/internships` — match-scored listings, resume upload, filters, full detail view.

## Document uploads

The "Upload Document" flow now accepts a real file (via `multer`, stored in
`backend/public/files/` and served statically at `/files/<filename>`). If no file is attached,
a placeholder `.txt` is generated automatically so the download link never 404s. Either way,
the document appears immediately in the student's Documents & Forms list — both dashboards
read from the same `documents` table/endpoint.

## Cross-sync between admin and student dashboards

Announcements, documents, and internships are **not** duplicated between roles — admin and
student views both read from the same database tables via the same API routes
(`/api/announcements`, `/api/documents`, `/api/internships`). When an admin publishes an
announcement, uploads a document, or adds an internship, it's immediately visible to students
on their next fetch (no separate "sync" step needed). Internship postings additionally
auto-create a suggested `internship_applications` row for every student so it shows up in
their matched-opportunities list right away.

## Logo assets

`frontend/public/` contains three logo variants, all transparent PNGs generated from the
original artwork:

- `logo-icon.png` — the "CP" mark only, used in the sidebar next to a text wordmark.
- `logo-full.png` — mark + "CampusPulse" wordmark (no tagline), used on the login screen.
- `logo.png` — the full mark + wordmark + tagline, kept for any future full-branding use.

## AI provider (Pulse AI, CV Builder, internship matching)

All AI features share one provider layer (`backend/src/lib/ai.js`). Auto-detection order:

1. **Groq** (recommended) — fast, free hosted inference. Get a key at https://console.groq.com and set `GROQ_API_KEY` in `.env`.
2. **Gemini** — Google AI Studio free tier. Get a key at https://aistudio.google.com and set `GEMINI_API_KEY`.
3. **Ollama** (optional/legacy) — fully offline, heavy on laptops. Set `OLLAMA_MODEL` only if you want no data leaving your machine.
4. **None** — rule-based fallback. Everything still works; Pulse AI answers from direct DB queries, CV Builder and matching use the keyword scorer.

Override the auto-detection by setting `AI_PROVIDER=groq|gemini|ollama|none`.

**Privacy note**: free tiers of Groq and Gemini are rate-limited per model and have no strong data-privacy guarantees. Do not send resume text or other sensitive personal data to them beyond what a tool requires. Ollama is the fully offline option if privacy is a hard requirement.

**Model names change.** Verify current free model names at:
- Groq: https://console.groq.com/docs/models
- Gemini: https://ai.google.dev/gemini-api/docs/models

### Pulse AI `/api/ai/ask` contract

Request:
```json
{ "message": "When is my next CIA?", "history": [{ "role": "user", "text": "..." }, { "role": "ai", "text": "..." }] }
```

Response:
```json
{ "reply": "Your next CIA is ...", "actions": [{ "type": "navigate", "label": "Calendar", "to": "/calendar" }], "source": "groq" }
```

`source` is `groq | gemini | ollama | rules`. `actions` are validated server-side against the page registry (max 3, deduplicated by path).

### Page registry

`backend/src/lib/pageRegistry.js` is the single source of truth for all routes, their labels, roles, and keywords. The AI agent uses this to produce `navigate` actions. Pages with `enabled: false` are never returned as navigation targets.

## CV Builder (student-only)

At `/cv-builder`, students pick which sections they want (Summary, Education, Experience,
Projects, Skills, Certifications, Achievements, Extracurricular, Languages), answer a short
set of questions per section, and generate a personalized CV. Answers and the generated CV
persist per-student in the `cv_profiles` table, so reopening the page resumes where they left
off. It's printable (Print/Save as PDF button) straight from the browser.

Generation uses your local Ollama model if `OLLAMA_MODEL` is set (see above); otherwise it
falls back to a rule-based formatter (`backend/src/routes/cv.js`) so the feature works out of
the box. The UI shows a small note when it's using the fallback so students know AI wording
isn't active yet.

## Internship matching (student-only)

Students can upload a resume (PDF/DOCX/TXT) on `/internships` — it's parsed server-side
(`pdf-parse` / `mammoth`) and compared against every internship's role, tags, and requirements
to produce a personalized match % with a one-line "why this match" explanation
(`backend/src/lib/matching.js`). Like CV Builder, this uses your local Ollama model when
`OLLAMA_MODEL` is set, and a keyword-overlap scorer otherwise — both are genuinely responsive
to resume content, just with different sophistication. Re-uploading a resume invalidates old
scores so they recompute against the new content; removing a resume reverts everyone to the
"upload to see your match %" empty state without touching applied/interviewing status.

The internships list also supports sorting (best match, newest/oldest posted, stipend
high↔low, deadline soonest/latest), work-mode filter chips, and a "Show closed" toggle.
Clicking "View More" opens a full detail view (company, JD, requirements, duration, stipend,
deadline) in place — no route change, so the back button returns to your exact scroll
position and filters.

## Security features

- **Helmet** — standard HTTP security headers (CSP, HSTS, etc.)
- **Rate limiting** — `/api/auth` capped at 30 requests / 15 min (brute-force protection)
- **Auth-gated static files** — `/files/*` and `/resumes/*` require a valid JWT (Bearer header or `?token=` query) so files can't be hot-linked
- **CORS** — reflects the request origin (not `*`); `allowedOrigins` list in `backend/src/index.js`
- **Role isolation** — every protected route checks `req.user.role`; student endpoints reject admins and vice versa
- **University isolation** — every query scopes to `req.user.university_id`; cross-tenant data access is impossible

## Global search & Command Palette

- `GET /api/search?q=<query>` — returns `{ pages, announcements, documents }` with a uniform `{ type, id, title, subtitle, url }` shape
- Topbar search bar (click or **Ctrl+K**) opens the Command Palette — keyboard navigation (↑↓ Enter Esc), debounced queries

## Announcement processing

`POST /api/announcements/process` — extracts structured fields (title, audience, body, action, event_date, priority) from raw text. Uses the configured AI provider when available; otherwise applies a fast regex-based extractor.  
`POST /api/announcements/:id/notify` — sends idempotent notifications to the matching audience (Roman-numeral semester, program, section matching). Re-calling the endpoint is safe — `notification_sent_at` prevents duplicates.

## What's real vs. mocked

- **Real**: auth (JWT + bcrypt), all CRUD for events/notifications/documents/internships, Postgres-backed queries for every dashboard widget, role-based access control, resume text extraction, CV/match generation, attendance records, seating assignments, student queries with replies, and **Pulse AI** (tool-calling agent with live DB tools for exams, attendance, seating, assignments, internships, documents, and navigation).
- **Rule-based fallback (always on)**: when no AI provider is configured, Pulse AI, the Announcement Processor, AI draft replies, and the Quiz Generator all fall back to direct DB queries or template generators — nothing requires an API key to function.
- **Timetable**: DB-backed (`timetable_slots` table) — weekly class schedule served from live data.
- **CIA Marks**: DB-backed (`cia_marks` table) — admin-managed, per-student published marks with GET/POST/PATCH API.

## Next steps / things to wire up before production

- Real file storage — swap `backend/public/files/` for S3/GCS; update `file_url` in documents table.
- Password reset / signup flow — currently only seeded demo accounts exist.
- Move `JWT_SECRET` and DB credentials into a proper secrets manager.
- Add pagination to notifications/documents/internships once data volume grows.
- CI: add a test suite before this goes further than a prototype.
- CIA Marks admin UI: an admin page to enter/publish marks per class (the API is ready at `/api/cia`).
