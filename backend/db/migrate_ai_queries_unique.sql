-- Migration: add UNIQUE (query_text, university_id) to ai_queries
-- Safe to run on an existing database. Deduplicates by keeping the row
-- with the highest hit_count before adding the constraint.

-- Step 1: collapse duplicate rows, summing hit counts
WITH dupes AS (
  SELECT
    MIN(id) AS keep_id,
    query_text,
    university_id,
    SUM(hit_count) AS total_hits
  FROM ai_queries
  GROUP BY query_text, university_id
  HAVING COUNT(*) > 1
)
UPDATE ai_queries aq
SET hit_count = dupes.total_hits
FROM dupes
WHERE aq.id = dupes.keep_id;

DELETE FROM ai_queries
WHERE id NOT IN (
  SELECT MIN(id)
  FROM ai_queries
  GROUP BY query_text, university_id
);

-- Step 2: add the constraint (idempotent — skipped if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_queries_query_text_university_id_key'
  ) THEN
    ALTER TABLE ai_queries ADD CONSTRAINT ai_queries_query_text_university_id_key
      UNIQUE (query_text, university_id);
  END IF;
END $$;
