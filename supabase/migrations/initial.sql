-- Enable uuid function (run once)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  ideal_answer text,
  level text,
  created_at timestamptz DEFAULT now()
);

-- Snippets / snippet challenges
CREATE TABLE IF NOT EXISTS snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  code text NOT NULL,
  explanation text,
  language text,
  created_at timestamptz DEFAULT now()
);

-- Jobs (job descriptions)
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Candidates
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  profile jsonb,
  created_at timestamptz DEFAULT now()
);

-- Shareable challenge (challenge config)
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL,
  share_token text UNIQUE NOT NULL,
  expires_at timestamptz,
  allowed_langs text[],
  public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Submissions by candidate
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL,
  code text,
  language text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- AI requests / responses for audit
CREATE TABLE IF NOT EXISTS ai_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text,
  response jsonb,
  tags text[],
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup by token
CREATE INDEX IF NOT EXISTS idx_challenges_token ON challenges(share_token);
