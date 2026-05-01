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
-- LEGACY: QUESTIONS TABLE (for backward compatibility)
-- ============================================================================

create table code_snippets (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  title       text not null,
  description text,
  language    text not null,
  code        text not null,
  explanation text,
  tags        text[] not null default '{}',
  difficulty  text not null check (difficulty in ('junior', 'mid', 'senior')),
  source      text not null default 'manual'
);

-- ─────────────────────────────────────────────
-- PEOPLE & JD
-- ─────────────────────────────────────────────

create table candidates (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text,
  skills      text[] not null default '{}',
  years_exp   integer,
  notes       text,
  resume_url  text
);

create table job_descriptions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  company     text,
  description text not null,
  skills      text[] not null default '{}'
);

-- ─────────────────────────────────────────────
-- SESSIONS
-- ─────────────────────────────────────────────

create table interview_sessions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  jd_id        uuid references job_descriptions(id) on delete set null,
  difficulty   text not null check (difficulty in ('junior', 'mid', 'senior')),
  status       text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  scheduled_at timestamptz,
  notes        text
);

create table session_questions (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references interview_sessions(id) on delete cascade,
  question_id uuid references questions(id) on delete set null,
  question    text not null,
  answer      text not null,
  order_index integer not null default 0,
  asked       boolean not null default false,
  rating      integer check (rating between 1 and 5)
);

-- ─────────────────────────────────────────────
-- CODE CHALLENGES
-- ─────────────────────────────────────────────

create table code_challenges (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  session_id          uuid references interview_sessions(id) on delete cascade,
  title               text not null,
  problem_statement   text not null,
  starter_code        text,
  supported_languages text[] not null default '{"javascript","typescript"}',
  time_limit_minutes  integer
);

create table challenge_links (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  challenge_id   uuid not null references code_challenges(id) on delete cascade,
  token          text not null unique default encode(gen_random_bytes(24), 'base64url'),
  expires_at     timestamptz not null,
  is_active      boolean not null default true,
  opened_at      timestamptz,
  candidate_name text
);

create index challenge_links_token_idx on challenge_links(token);

create table challenge_submissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  link_id     uuid not null references challenge_links(id) on delete cascade,
  language    text not null,
  code        text not null,
  is_snapshot boolean not null default false,
  ai_analysis jsonb
);

-- ─────────────────────────────────────────────
-- REALTIME LIVE CODE (one upserted row per active link)
-- ─────────────────────────────────────────────

create table live_code_state (
  link_id    uuid primary key references challenge_links(id) on delete cascade,
  language   text not null default 'javascript',
  code       text not null default '',
  updated_at timestamptz not null default now()
);

-- Enable realtime for this table
alter publication supabase_realtime add table live_code_state;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table questions             enable row level security;
alter table code_snippets         enable row level security;
alter table candidates            enable row level security;
alter table job_descriptions      enable row level security;
alter table interview_sessions    enable row level security;
alter table session_questions     enable row level security;
alter table code_challenges       enable row level security;
alter table challenge_links       enable row level security;
alter table challenge_submissions enable row level security;
alter table live_code_state       enable row level security;

-- Authenticated users (admin) have full access to all tables
create policy "admin_all" on questions             for all to authenticated using (true) with check (true);
create policy "admin_all" on code_snippets         for all to authenticated using (true) with check (true);
create policy "admin_all" on candidates            for all to authenticated using (true) with check (true);
create policy "admin_all" on job_descriptions      for all to authenticated using (true) with check (true);
create policy "admin_all" on interview_sessions    for all to authenticated using (true) with check (true);
create policy "admin_all" on session_questions     for all to authenticated using (true) with check (true);
create policy "admin_all" on code_challenges       for all to authenticated using (true) with check (true);
create policy "admin_all" on challenge_links       for all to authenticated using (true) with check (true);
create policy "admin_all" on challenge_submissions for all to authenticated using (true) with check (true);
create policy "admin_all" on live_code_state       for all to authenticated using (true) with check (true);

-- Anonymous (candidate) can write live_code_state — server validates the token first
create policy "public_write_live_code" on live_code_state
  for all to anon using (true) with check (true);

-- Anonymous can insert challenge_submissions (final submission from candidate)
create policy "public_insert_submissions" on challenge_submissions
  for insert to anon with check (true);
