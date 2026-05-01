-- Add columns to code_snippets that were missing from initial deployment
-- (CREATE TABLE IF NOT EXISTS in 0001 skipped these since table already existed)

ALTER TABLE code_snippets
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'mid' CHECK (difficulty IN ('junior', 'mid', 'senior')),
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
