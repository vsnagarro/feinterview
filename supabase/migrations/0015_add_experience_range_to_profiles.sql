-- Add experience_range to interview_profiles
-- Stores the target years-of-experience range for a role (e.g. "3–5 years")

ALTER TABLE interview_profiles
ADD COLUMN IF NOT EXISTS experience_range TEXT;
