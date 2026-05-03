-- Add metadata JSONB column to session_questions for storing
-- topicExplanation, highlights, analogy, and codeExamples from AI generation.
ALTER TABLE session_questions
  ADD COLUMN IF NOT EXISTS metadata JSONB;
