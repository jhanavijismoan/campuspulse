-- CIA (Continuous Internal Assessment) marks per student per class
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

-- Seed: CIA 1 published marks for all five students in BBA Sem 3C
-- Students: 1=jhanavi, 3=ananya, 4=diya, 5=meera, 6=rhea
-- Classes: 10=Business Comm, 8=Marketing, 9=Corp Accounting, 11=English, 7=Banking Law

INSERT INTO cia_marks (class_id, student_id, cia_number, marks_obtained, max_marks, published) VALUES
  -- Jhanavi (id=1)
  (10, 1, 1, 23, 25, true),
  ( 8, 1, 1, 21, 25, true),
  ( 9, 1, 1, 19, 25, true),
  (11, 1, 1, 22, 25, true),
  ( 7, 1, 1, 20, 25, true),
  -- Ananya (id=3)
  (10, 3, 1, 22, 25, true),
  ( 8, 3, 1, 20, 25, true),
  ( 9, 3, 1, 21, 25, true),
  (11, 3, 1, 24, 25, true),
  ( 7, 3, 1, 18, 25, true),
  -- Diya (id=4)
  (10, 4, 1, 20, 25, true),
  ( 8, 4, 1, 23, 25, true),
  ( 9, 4, 1, 22, 25, true),
  (11, 4, 1, 19, 25, true),
  ( 7, 4, 1, 21, 25, true),
  -- Meera (id=5)
  (10, 5, 1, 24, 25, true),
  ( 8, 5, 1, 22, 25, true),
  ( 9, 5, 1, 23, 25, true),
  (11, 5, 1, 20, 25, true),
  ( 7, 5, 1, 19, 25, true),
  -- Rhea (id=6)
  (10, 6, 1, 18, 25, true),
  ( 8, 6, 1, 19, 25, true),
  ( 9, 6, 1, 17, 25, true),
  (11, 6, 1, 21, 25, true),
  ( 7, 6, 1, 16, 25, true)
ON CONFLICT (class_id, student_id, cia_number) DO NOTHING;
