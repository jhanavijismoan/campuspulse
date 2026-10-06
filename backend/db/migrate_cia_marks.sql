-- CIA marks table — DDL only
-- Run once before seed.js. Data is managed by seed.js.

CREATE TABLE IF NOT EXISTS cia_marks (
  id              SERIAL PRIMARY KEY,
  class_id        INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id      INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  cia_number      INTEGER NOT NULL CHECK (cia_number IN (1, 2, 3)),
  marks_obtained  NUMERIC(5,2) NOT NULL CHECK (marks_obtained >= 0),
  max_marks       NUMERIC(5,2) NOT NULL DEFAULT 25 CHECK (max_marks > 0),
  published       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, student_id, cia_number)
);
