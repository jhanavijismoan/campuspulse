-- Internships system migration — adds all new fields while preserving existing data

-- Extend internships table
ALTER TABLE internships
  ADD COLUMN IF NOT EXISTS university_id     INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publish_date      DATE,
  ADD COLUMN IF NOT EXISTS taken_down        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS taken_down_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS taken_down_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS about_company     TEXT,
  ADD COLUMN IF NOT EXISTS job_description   TEXT,
  ADD COLUMN IF NOT EXISTS job_requirements  TEXT,
  ADD COLUMN IF NOT EXISTS required_skills   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_skills  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eligibility       TEXT,
  ADD COLUMN IF NOT EXISTS course            TEXT,
  ADD COLUMN IF NOT EXISTS target_semester   TEXT,
  ADD COLUMN IF NOT EXISTS application_url   TEXT,
  ADD COLUMN IF NOT EXISTS stipend_currency  TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now();

-- Back-fill: existing rows from seeded data become published so students still see them
UPDATE internships SET
  published = true,
  published_at = created_at,
  university_id = 1,
  created_by = 2
WHERE published = false AND university_id IS NULL;

-- Seed 3 richer sample internships for Mount Carmel (university_id=1)
INSERT INTO internships (
  university_id, created_by, company_name, role_title, location, work_mode,
  stipend_text, stipend_amount, stipend_currency,
  about_company, description, job_description, job_requirements,
  required_skills, preferred_skills, tags,
  eligibility, course, target_semester,
  application_deadline, publish_date, published, published_at, duration, application_url
) VALUES
(
  1, 2, 'Deloitte India', 'Business Analyst Intern', 'Bengaluru', 'Hybrid',
  '₹20,000/month', 20000, 'INR',
  'Deloitte is a leading global provider of audit, consulting, financial advisory, risk management, and tax services.',
  'Join our Consulting practice as a Business Analyst Intern and work alongside senior consultants on real client engagements.',
  'Assist in gathering and documenting business requirements. Prepare presentations, reports, and dashboards for clients. Conduct market research and competitive analysis. Support project management activities.',
  'Strong analytical and problem-solving skills. Excellent communication skills. Proficiency in MS Excel and PowerPoint. Ability to work in a fast-paced team environment.',
  ARRAY['MS Excel','PowerPoint','Business Analysis','Data Analysis'],
  ARRAY['SQL','Tableau','Project Management'],
  ARRAY['Business Analysis','Consulting','Excel','PowerPoint'],
  'Open to 3rd and 5th semester BBA students', 'BBA', 'Sem 3',
  CURRENT_DATE + 30, CURRENT_DATE, true, now(), '3 months', 'https://apply.deloitte.com/intern'
),
(
  1, 2, 'HDFC Bank', 'Finance & Credit Intern', 'Mumbai', 'On-site',
  '₹15,000/month', 15000, 'INR',
  'HDFC Bank is India''s largest private sector bank, offering a full range of banking products and financial services.',
  'Gain hands-on experience in credit analysis, retail banking operations, and financial product management at one of India''s top banks.',
  'Support credit appraisal of retail loan applications. Prepare credit memos and risk reports. Assist branch operations team with KYC documentation. Analyse customer financial statements.',
  'Basic understanding of accounting and finance. Knowledge of banking products. Strong attention to detail. Proficiency in MS Office Suite.',
  ARRAY['Accounting','Finance','MS Office','Banking'],
  ARRAY['Credit Analysis','Financial Modelling','Tally'],
  ARRAY['Finance','Banking','Accounting','Credit Analysis'],
  'BCom 3rd semester students preferred', 'BCom', 'Sem 3',
  CURRENT_DATE + 45, CURRENT_DATE, true, now(), '6 months', 'https://hdfcbank.com/careers/intern'
),
(
  1, 2, 'startupXYZ', 'Marketing & Content Intern', 'Remote', 'Remote',
  '₹8,000/month', 8000, 'INR',
  'startupXYZ is a fast-growing EdTech startup helping students in India prepare for competitive examinations.',
  'We are looking for a creative and driven marketing intern who can help grow our social media presence and create compelling content for students.',
  'Create daily content for Instagram, LinkedIn, and YouTube. Write blog posts and email newsletters. Assist with campaign strategy and performance tracking. Collaborate with the product team.',
  'Strong written and verbal communication in English. Familiarity with social media platforms. Creative mindset. Basic graphic design knowledge is a plus.',
  ARRAY['Content Writing','Social Media','Digital Marketing'],
  ARRAY['Graphic Design','Canva','SEO','Email Marketing'],
  ARRAY['Marketing','Content','Social Media','Digital'],
  'Open to all BBA students', 'BBA', NULL,
  CURRENT_DATE + 14, CURRENT_DATE, true, now(), '2 months', 'https://startupxyz.in/apply'
)
ON CONFLICT DO NOTHING;

-- Ensure all students have application rows for the new internships
INSERT INTO internship_applications (internship_id, user_id, status)
SELECT i.id, u.id, 'suggested'
FROM internships i CROSS JOIN users u
WHERE u.role = 'student' AND i.published = true
ON CONFLICT DO NOTHING;
