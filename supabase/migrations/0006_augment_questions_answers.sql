-- Augment questions table with detailed answer content
-- Adds columns for simple explanations, examples, and code examples

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS simple_explanation TEXT,
ADD COLUMN IF NOT EXISTS examples TEXT[],
ADD COLUMN IF NOT EXISTS code_examples JSONB;

-- JSONB structure for code_examples:
-- [
--   { "language": "javascript", "code": "..." },
--   { "language": "python", "code": "..." }
-- ]

CREATE INDEX IF NOT EXISTS idx_questions_with_examples 
ON questions(id) 
WHERE simple_explanation IS NOT NULL OR examples IS NOT NULL;
