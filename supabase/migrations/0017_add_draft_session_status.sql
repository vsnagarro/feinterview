-- Add 'draft' to the sessions status enum
-- Sessions can be saved as draft at any point in the creation form
-- and resumed later via /sessions/new?draftId=<id>

ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE sessions
ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('draft', 'pending', 'active', 'submitted', 'completed', 'expired'));
