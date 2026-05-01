-- ============================================================================
-- CODING CHALLENGE PLATFORM - INITIAL DATABASE SCHEMA
-- ============================================================================
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. INTERVIEWERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS interviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviewers_email ON interviewers(email);

-- ============================================================================
-- 2. CANDIDATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  experience_level VARCHAR(50),  -- 'Junior', 'Mid', 'Senior'
  skills TEXT[] DEFAULT '{}',    -- Array of skill tags
  summary TEXT,
  created_by_id UUID NOT NULL REFERENCES interviewers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_interviewer_id ON candidates(created_by_id);

-- ============================================================================
-- 3. JOB DESCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',       -- Array of skills
  tech_stack TEXT[] DEFAULT '{}',            -- Array of technologies
  experience_level VARCHAR(50),              -- 'Junior', 'Mid', 'Senior'
  created_by_id UUID NOT NULL REFERENCES interviewers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_interviewer_id ON job_descriptions(created_by_id);

-- ============================================================================
-- 4. SESSIONS TABLE (Challenge Sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_token VARCHAR(255) UNIQUE NOT NULL,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES interviewers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',  -- 'pending', 'active', 'submitted', 'completed', 'expired'
  languages TEXT[] DEFAULT ARRAY['javascript'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_candidate_id ON sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_interviewer_id ON sessions(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_challenge_token ON sessions(challenge_token);

-- ============================================================================
-- 5. CODE SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  analysis JSONB  -- AI analysis results
);

CREATE INDEX IF NOT EXISTS idx_code_submissions_session_id ON code_submissions(session_id);

-- ============================================================================
-- 6. QUESTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category VARCHAR(100),
  level VARCHAR(50),  -- 'Junior', 'Mid', 'Senior'
  answer TEXT NOT NULL,
  explanation TEXT,
  languages TEXT[] DEFAULT '{}',  -- Related technologies
  question_type VARCHAR(50),      -- 'mcq', 'short_answer', 'code_challenge'
  created_by_id UUID REFERENCES interviewers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_level_category ON questions(level, category);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by_id);

-- ============================================================================
-- 7. CODE SNIPPETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  explanation TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('junior', 'mid', 'senior')),
  source TEXT NOT NULL DEFAULT 'manual'
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'admin_all'
  ) THEN
    CREATE POLICY "admin_all" ON questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'code_snippets' AND policyname = 'admin_all'
  ) THEN
    CREATE POLICY "admin_all" ON code_snippets FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidates' AND policyname = 'admin_all'
  ) THEN
    CREATE POLICY "admin_all" ON candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'job_descriptions' AND policyname = 'admin_all'
  ) THEN
    CREATE POLICY "admin_all" ON job_descriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sessions' AND policyname = 'admin_all'
  ) THEN
    CREATE POLICY "admin_all" ON sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'code_submissions' AND policyname = 'admin_all'
  ) THEN
    CREATE POLICY "admin_all" ON code_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
