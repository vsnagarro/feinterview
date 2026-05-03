-- Add highlights column to questions table for library augmentation
-- Stores key takeaways as an array of bullet-point strings

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS highlights TEXT[];
