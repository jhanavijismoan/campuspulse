-- CV Builder migration: structured data + active CV selection

-- Extend cv_profiles with structured personal info and structured plain text
ALTER TABLE cv_profiles
  ADD COLUMN IF NOT EXISTS personal_info  JSONB    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS structured_cv  JSONB,
  ADD COLUMN IF NOT EXISTS structured_text TEXT;

-- Add active CV source tracking to student_resumes
-- 'uploaded' = the file upload, 'built' = the structured CV builder
ALTER TABLE student_resumes
  ADD COLUMN IF NOT EXISTS active_cv_source TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (active_cv_source IN ('uploaded', 'built'));

-- Also allow cv_profiles to store a generated text for matching when active
-- (structured_text is extracted into student_resumes.extracted_text on activation)
