-- Expand session statuses to include selected and failed
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check CHECK (
  status IN ('draft', 'pending', 'active', 'submitted', 'completed', 'expired', 'selected', 'failed')
);

-- Add recommendations column to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recommendations TEXT;
