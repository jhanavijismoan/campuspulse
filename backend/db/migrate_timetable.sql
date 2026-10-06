-- Timetable slots: recurring weekly schedule for each class
CREATE TABLE IF NOT EXISTS timetable_slots (
  id           SERIAL PRIMARY KEY,
  class_id     INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 4), -- 0=Mon … 4=Fri
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  room         TEXT,
  slot_type    TEXT NOT NULL DEFAULT 'class' CHECK (slot_type IN ('class','exam','meeting','lab')),
  label        TEXT,         -- override display name (e.g. exam title)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: BBA Sem 3 Section C schedule (matches former FIXED_TIMETABLE constant)
-- class_id mapping: 10=Business Communication, 8=Marketing Management,
--   9=Corporate Accounting, 11=General English, 7=Banking Law and Practice

INSERT INTO timetable_slots (class_id, day_of_week, start_time, end_time, room, slot_type) VALUES
  (10, 0, '09:00', '10:00', 'B204',        'class'),   -- Mon: Business Communication
  ( 8, 0, '10:00', '11:00', 'B204',        'class'),   -- Mon: Marketing Management
  ( 9, 0, '11:30', '12:30', 'C301',        'class'),   -- Mon: Corporate Accounting
  (11, 1, '09:00', '10:00', 'B204',        'class'),   -- Tue: English Language
  (10, 1, '10:00', '11:00', 'B204',        'class'),   -- Tue: Business Communication
  ( 8, 1, '11:30', '12:30', 'C301',        'class'),   -- Tue: Marketing Management
  ( 7, 2, '09:00', '10:00', 'B204',        'class'),   -- Wed: Banking Law and Practice
  ( 9, 3, '09:00', '10:00', 'C301',        'class'),   -- Thu: Corporate Accounting
  (11, 3, '10:00', '11:00', 'B204',        'class'),   -- Thu: English Language
  ( 8, 4, '09:00', '10:00', 'B204',        'class'),   -- Fri: Marketing Management
  ( 7, 4, '10:00', '11:00', 'C301',        'class'),   -- Fri: Banking Law and Practice
  (10, 4, '11:30', '12:30', 'B204',        'class')    -- Fri: Business Communication
ON CONFLICT DO NOTHING;
