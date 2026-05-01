ALTER TABLE code_challenges
  ADD COLUMN IF NOT EXISTS sandbox_dependencies JSONB NOT NULL DEFAULT '{}'::jsonb;