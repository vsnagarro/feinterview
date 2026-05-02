-- Add explanation column to session_questions
ALTER TABLE session_questions
  ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Index for ordering and quick lookup
CREATE INDEX IF NOT EXISTS idx_session_questions_order ON session_questions(session_id, order_index);