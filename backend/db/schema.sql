-- CampusPulse database schema
-- Run with: psql -U postgres -d campuspulse -f schema.sql

DROP TABLE IF EXISTS ai_queries CASCADE;
DROP TABLE IF EXISTS admin_insights CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS class_students CASCADE;
DROP TABLE IF EXISTS pending_tasks CASCADE;
DROP TABLE IF EXISTS student_queries CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS deadlines CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS cv_profiles CASCADE;
DROP TABLE IF EXISTS student_resumes CASCADE;
DROP TABLE IF EXISTS internship_applications CASCADE;
DROP TABLE IF EXISTS internships CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS seat_assignments CASCADE;
DROP TABLE IF EXISTS invigilation_duties CASCADE;
DROP TABLE IF EXISTS exam_halls CASCADE;
DROP TABLE IF EXISTS exam_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS universities CASCADE;

-- ---------- Core identity ----------

CREATE TABLE universities (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  university_id   INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  program         TEXT,              -- e.g. "BBA"
  semester        TEXT,              -- e.g. "Sem 3"
  section         TEXT,              -- e.g. "Section C"
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Academic calendar / "My Week" ----------

CREATE TABLE events (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('exam', 'assignment', 'presentation', 'meeting', 'association_work', 'class')),
  description   TEXT,
  location      TEXT,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ,
  all_day       BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due_soon', 'urgent', 'completed')),
  action_label  TEXT,             -- e.g. "View Seating Plan"
  action_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_user_time ON events(user_id, starts_at);

-- ---------- Announcements + AI processing ----------

CREATE TABLE announcements (
  id                SERIAL PRIMARY KEY,
  university_id     INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  raw_text          TEXT NOT NULL,
  title             TEXT,
  audience          TEXT,        -- "who": e.g. "II BBA Students"
  body              TEXT,
  action            TEXT,
  event_date        DATE,
  scheduled_at      TIMESTAMPTZ,
  priority          TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'ready_to_publish', 'scheduled', 'published', 'archived')),
  notification_sent_at  TIMESTAMPTZ,
  created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Notifications ----------

CREATE TABLE notifications (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'urgent', 'success')),
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- ---------- Internship opportunities ----------

CREATE TABLE internships (
  id                    SERIAL PRIMARY KEY,
  company_name          TEXT NOT NULL,
  logo_url              TEXT,
  role_title            TEXT NOT NULL,
  location              TEXT,
  work_mode             TEXT CHECK (work_mode IN ('Remote', 'Hybrid', 'On-site')),
  stipend_text          TEXT,
  stipend_amount        INTEGER,           -- monthly amount in rupees, nullable — powers stipend sort
  tags                  TEXT[] DEFAULT '{}',
  description           TEXT,              -- job description
  requirements          TEXT,              -- requirements / qualifications
  duration              TEXT,              -- e.g. "3 months"
  application_deadline  DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()   -- also used as "posted" date
);

CREATE TABLE internship_applications (
  id              SERIAL PRIMARY KEY,
  internship_id   INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_score     INTEGER,                -- 0-100, personalized match % — NULL until computed
  match_reason    TEXT,                   -- one-line explanation of the score
  status          TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'applied', 'interviewing', 'offered', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (internship_id, user_id)
);

-- ---------- Documents & forms ----------

CREATE TABLE documents (
  id            SERIAL PRIMARY KEY,
  university_id INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  category      TEXT,
  audience      TEXT,
  file_url      TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Admin teaching workflow ----------

CREATE TABLE classes (
  id            SERIAL PRIMARY KEY,
  teacher_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name  TEXT NOT NULL,
  program       TEXT NOT NULL,
  section       TEXT NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE class_students (
  id          SERIAL PRIMARY KEY,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  roll_no     TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  UNIQUE (class_id, roll_no)
);

CREATE TABLE attendance_records (
  id            SERIAL PRIMARY KEY,
  class_id       INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  class_student_id INTEGER NOT NULL REFERENCES class_students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, class_student_id, attendance_date)
);

CREATE TABLE pending_tasks (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  due_date    DATE,
  priority    TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  completed   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_queries (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  student_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  reply       TEXT,
  answered    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ
);

-- ---------- Admin analytics ----------

CREATE TABLE deadlines (
  id                SERIAL PRIMARY KEY,
  university_id     INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  due_date          DATE NOT NULL,
  priority          TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
  affected_students INTEGER DEFAULT 0
);

CREATE TABLE admin_insights (
  id            SERIAL PRIMARY KEY,
  university_id INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  insight_text  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_queries (
  id            SERIAL PRIMARY KEY,
  university_id INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  query_text    TEXT NOT NULL,
  hit_count     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (query_text, university_id)
);

-- CV Builder: one active CV profile per student, holds both the raw Q&A
-- inputs (so the wizard can be re-opened and edited) and the last generated
-- output (structured JSON + a flat text/markdown version for copy/print).
CREATE TABLE cv_profiles (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  target_role    TEXT,
  tone           TEXT NOT NULL DEFAULT 'professional',
  sections       JSONB NOT NULL DEFAULT '[]',
  answers        JSONB NOT NULL DEFAULT '{}',
  generated_cv   JSONB,
  generated_text TEXT,
  generated_by   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uploaded resume/CV used specifically for internship match scoring. One per
-- student; re-uploading replaces it and invalidates existing match scores so
-- they get recomputed against the new content.
CREATE TABLE student_resumes (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  file_url           TEXT NOT NULL,
  original_filename  TEXT,
  extracted_text     TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Seating / Exam Module ----------

-- An exam session: one sitting for one exam (e.g. "CIA 1 — BBA Semester 3")
CREATE TABLE exam_sessions (
  id              SERIAL PRIMARY KEY,
  university_id   INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,               -- e.g. "CIA 1 — BBA Semester 3"
  exam_date       DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  program         TEXT,                        -- e.g. "BBA", "BCom" — null = all programs
  semester        INTEGER,                     -- null = all semesters
  published       BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A physical exam hall
CREATE TABLE exam_halls (
  id              SERIAL PRIMARY KEY,
  university_id   INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,               -- e.g. "Hall B204", "Seminar Hall 1"
  capacity        INTEGER NOT NULL DEFAULT 30,
  rows            INTEGER NOT NULL DEFAULT 5,
  seats_per_row   INTEGER NOT NULL DEFAULT 6,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, name)
);

-- One row per student–seat assignment within a session+hall
CREATE TABLE seat_assignments (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  hall_id         INTEGER NOT NULL REFERENCES exam_halls(id) ON DELETE CASCADE,
  student_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  row_number      INTEGER NOT NULL,            -- 1-based
  seat_number     INTEGER NOT NULL,            -- 1-based within the row
  roll_no         TEXT,                        -- denormalised for display
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id),             -- one seat per student per session
  UNIQUE (session_id, hall_id, row_number, seat_number)  -- no double-booking
);

-- Invigilation duty: which admin/teacher covers which hall for which session
CREATE TABLE invigilation_duties (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  hall_id         INTEGER NOT NULL REFERENCES exam_halls(id) ON DELETE CASCADE,
  admin_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duty_role       TEXT NOT NULL DEFAULT 'invigilator',  -- invigilator | chief_invigilator | observer
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, hall_id, admin_id)
);
