-- Add resume_url column to candidates, add extra_checks, target_level, trickiness to sessions
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS resume_url TEXT;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS extra_checks TEXT,
  ADD COLUMN IF NOT EXISTS target_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS trickiness INT;
