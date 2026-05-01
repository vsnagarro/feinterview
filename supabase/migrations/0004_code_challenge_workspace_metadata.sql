ALTER TABLE code_challenges
  ADD COLUMN IF NOT EXISTS use_case TEXT,
  ADD COLUMN IF NOT EXISTS requirements TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS workspace_template TEXT NOT NULL DEFAULT 'vanilla';

ALTER TABLE code_challenges
  DROP CONSTRAINT IF EXISTS code_challenges_workspace_template_check;

ALTER TABLE code_challenges
  ADD CONSTRAINT code_challenges_workspace_template_check
  CHECK (workspace_template IN ('vanilla', 'react', 'tailwind'));