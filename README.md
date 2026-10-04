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

Create the database and load the schema:

```bash
createdb campuspulse                      # or: psql -U postgres -c "CREATE DATABASE campuspulse;"
psql -U postgres -d campuspulse -f db/schema.sql
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

Beyond the main `/` dashboard, admins get a few dedicated full pages (also reachable from the
sidebar and from each dashboard card's "View All"):

- `/classes` — every class assigned to the admin, each linking to `/classes/:id/attendance`
  to mark attendance for a specific date.
- `/tasks` — the full pending-tasks list (assignments/approvals/evaluations), with filtering
  and a "New Task" form.
- `/reports` — a fuller version of the Admin Analytics card (engagement stats, upcoming
  deadlines, top Pulse AI queries).
- `/announcements` — read-only list for students; for admins this is the full manage view
  (tabs, publish/delete, create) rather than the trimmed 6-row table shown on the dashboard.

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

## Local AI via Ollama (free, no API key)

CV Builder and internship matching both use a shared helper (`backend/src/lib/ai.js`) that
calls a locally-running [Ollama](https://ollama.com) model — free, no API key, nothing leaves
your machine. Setup:

1. Install Ollama: https://ollama.com/download
2. Pull a model, e.g. `ollama pull llama3.2` (small/fast) or `ollama pull llama3.1` (larger,
   better quality if your machine can handle it)
3. In `backend/.env`, set `OLLAMA_MODEL=llama3.2` (matching whatever you pulled)
4. Make sure the Ollama app is running, then restart the backend (`npm run dev`)

Leave `OLLAMA_MODEL` blank and both features still work out of the box using a rule-based
fallback (simpler template text for CV Builder, keyword-overlap scoring for matching) — this
is what happens if Ollama isn't running, or a request to it fails.

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

## What's real vs. mocked

- **Real**: auth (JWT + bcrypt), all CRUD for events/notifications/documents/internships,
  Postgres-backed queries for every dashboard widget, role-based access control for admin
  routes, resume text extraction, and CV/match generation (real local-AI calls via Ollama when
  `OLLAMA_MODEL` is set).
- **Mocked (by design, per your instructions)**: the "AI" in Pulse AI and the Announcement
  Processor. Both are rule-based stand-ins that live in `backend/src/routes/ai.js` and
  `backend/src/routes/announcements.js`. Pulse AI's mock still queries the real database, so
  its answers ("when's my next CIA," "what's due this week") are accurate — it just doesn't use
  an LLM to generate the natural-language response. Swap in a call to `generateJSON()` from
  `backend/src/lib/ai.js` (the same Ollama helper CV Builder and matching use) inside
  `answerFromRules()` / `mockExtractAnnouncement()` when you're ready; the request/response
  contract for both routes is already shaped for a drop-in replacement.

## Next steps / things to wire up before production

- Replace the mocked AI routes with real calls to `generateJSON()` (system prompt + the same
  DB context already being fetched) — same pattern as CV Builder / internship matching.
- Real file storage for Documents & Forms (currently placeholder .txt files served from
  `backend/public/files`) — swap for S3/GCS or similar and store real uploaded PDFs.
- Password reset / signup flow — currently only seeded demo accounts exist.
- Move `JWT_SECRET` and DB credentials out of `.env` into a proper secrets manager for
  production deployment.
- Add pagination to notifications/documents/internships once data volume grows.
- CI: add a test suite (none included yet) before this goes further than a working prototype.
