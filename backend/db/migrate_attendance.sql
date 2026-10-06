-- Attendance system migration — DDL only
-- Run once before seed.js. Data is managed by seed.js.

-- Add columns to classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS attendance_type TEXT NOT NULL DEFAULT 'Theory';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS semester TEXT;

-- Tighten attendance_records status values
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check
  CHECK (status IN ('present', 'absent', 'late', 'cl'));
