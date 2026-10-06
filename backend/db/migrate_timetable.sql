-- Timetable slots table — DDL only
-- Run once before seed.js. Data is managed by seed.js.

CREATE TABLE IF NOT EXISTS timetable_slots (
  id           SERIAL PRIMARY KEY,
  class_id     INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 4), -- 0=Mon … 4=Fri
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  room         TEXT,
  slot_type    TEXT NOT NULL DEFAULT 'class' CHECK (slot_type IN ('class','exam','meeting','lab')),
  label        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
