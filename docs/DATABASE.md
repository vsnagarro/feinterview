# Database Schema Documentation

## Coding Challenge & Interview Platform

---

## Overview

**Database:** Supabase (PostgreSQL 14+)
**Realtime:** Supabase Realtime (WebSocket via pg_notify)
**Storage:** PostgreSQL (no external file storage needed)

---

## Tables & Schema

### 1. interviewers

Stores admin/interviewer user accounts.

```sql
CREATE TABLE interviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2. candidates

Stores candidate information for coding challenges.

```sql
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  experience_level VARCHAR(50),  -- 'Junior', 'Mid', 'Senior'
  skills TEXT[],                  -- Array of skill tags
  summary TEXT,
  created_by_id UUID REFERENCES interviewers(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_candidates_interviewer_id ON candidates(created_by_id);
```

---

### 3. job_descriptions

Stores job postings for reference when generating questions.

```sql
CREATE TABLE job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[],         -- Array of skills
  tech_stack TEXT[],              -- Array of technologies
  experience_level VARCHAR(50),   -- 'Junior', 'Mid', 'Senior'
  created_by_id UUID REFERENCES interviewers(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4. sessions

Stores coding challenge sessions with time-limited shareable links.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_token VARCHAR(255) UNIQUE NOT NULL,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES interviewers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',  -- 'pending', 'active', 'completed', 'expired'
  languages TEXT[],  -- ['javascript', 'python', 'java']
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_candidate_id ON sessions(candidate_id);
CREATE INDEX idx_sessions_interviewer_id ON sessions(interviewer_id);
CREATE INDEX idx_sessions_challenge_token ON sessions(challenge_token);
```

---

### 5. code_submissions

Stores candidate code submissions with optional AI analysis.

```sql
CREATE TABLE code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  analysis JSONB  -- AI analysis results
);

CREATE INDEX idx_code_submissions_session_id ON code_submissions(session_id);
```

---

### 6. questions

Question bank built from AI-generated and manually-added questions.

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category VARCHAR(100),
  level VARCHAR(50),  -- 'Junior', 'Mid', 'Senior'
  answer TEXT NOT NULL,
  explanation TEXT,
  languages TEXT[],  -- Related technologies ['javascript', 'react']
  question_type VARCHAR(50),  -- 'mcq', 'short_answer', 'code_challenge'
  created_by_id UUID REFERENCES interviewers(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_questions_level_category ON questions(level, category);
CREATE INDEX idx_questions_created_by ON questions(created_by_id);
```

---

### 7. code_snippets

Code snippet library for references and examples.

```sql
CREATE TABLE code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,  -- 'javascript', 'python', 'java'
  level VARCHAR(50),  -- 'Junior', 'Mid', 'Senior'
  category VARCHAR(100),
  explanation TEXT,
  tags TEXT[],
  created_by_id UUID REFERENCES interviewers(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_code_snippets_language ON code_snippets(language);
CREATE INDEX idx_code_snippets_level ON code_snippets(level);
```

---

## Entity Relationships

```
interviewers (1) ──── (N) candidates
interviewers (1) ──── (N) job_descriptions
interviewers (1) ──── (N) sessions
interviewers (1) ──── (N) questions
interviewers (1) ──── (N) code_snippets

candidates (1) ──── (N) sessions
job_descriptions (1) ──── (N) sessions
sessions (1) ──── (N) code_submissions
```

---

## Example Queries

### Get all candidates created by an interviewer

```sql
SELECT * FROM candidates
WHERE created_by_id = '12345678-1234-1234-1234-123456789012'
ORDER BY created_at DESC;
```

### Get active sessions expiring in next 24 hours

```sql
SELECT s.*, c.name as candidate_name, j.title as job_title
FROM sessions s
JOIN candidates c ON s.candidate_id = c.id
JOIN job_descriptions j ON s.job_description_id = j.id
WHERE s.status = 'active'
  AND s.expires_at <= NOW() + INTERVAL '24 hours'
ORDER BY s.expires_at ASC;
```

### Get all submissions for a session

```sql
SELECT * FROM code_submissions
WHERE session_id = '87654321-4321-4321-4321-210987654321'
ORDER BY submitted_at DESC;
```

### Get questions by level and category

```sql
SELECT * FROM questions
WHERE level = 'Senior'
  AND category = 'JavaScript'
ORDER BY created_at DESC
LIMIT 10;
```

### Insert a new candidate

```sql
INSERT INTO candidates (name, email, experience_level, skills, created_by_id)
VALUES (
  'John Doe',
  'john@example.com',
  'Mid',
  ARRAY['React', 'TypeScript', 'Node.js'],
  '12345678-1234-1234-1234-123456789012'
);
```

### Insert a code submission

```sql
INSERT INTO code_submissions (session_id, code, language)
VALUES (
  '87654321-4321-4321-4321-210987654321',
  'function hello() { console.log("hi"); }',
  'javascript'
);
```

### Update session status

```sql
UPDATE sessions
SET status = 'completed', updated_at = NOW()
WHERE id = '87654321-4321-4321-4321-210987654321';
```

### Get all questions for a candidate's interview

```sql
SELECT q.* FROM questions q
JOIN sessions s ON s.job_description_id IN (SELECT job_description_id FROM sessions WHERE candidate_id = 'candidate-uuid')
WHERE q.level = (SELECT experience_level FROM candidates WHERE id = 'candidate-uuid')
ORDER BY q.created_at DESC
LIMIT 20;
```

---

## Backup & Recovery

### Export Database

```bash
supabase db dump --file backup.sql
```

### Import Database

```bash
psql -h <host> -U <user> -d <db_name> < backup.sql
```

### Supabase Dashboard Backup

- Supabase auto-backs up daily on Pro plan
- Free tier: manual backup only
- Go to Settings → Database → Backups

---

## Row Level Security (RLS)

Enable RLS on sensitive tables:

```sql
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Interviewers can only see their own candidates
CREATE POLICY "Users can see own candidates"
ON candidates
FOR SELECT
USING (created_by_id = auth.uid());

CREATE POLICY "Users can create candidates"
ON candidates
FOR INSERT
WITH CHECK (created_by_id = auth.uid());
```

---

## Performance Optimization

1. **Indexes:** Created on commonly queried columns (see schemas above)
2. **Query Optimization:** Use EXPLAIN ANALYZE to profile slow queries
3. **Connection Pooling:** Supabase handles this automatically
4. **Caching:** Consider caching popular questions in-app

---

## Data Retention Policy

- **Sessions:** Expire automatically based on `expires_at`
- **Code Submissions:** Keep indefinitely (interview history)
- **Questions/Snippets:** Keep indefinitely (library)
- **User Accounts:** Keep unless deleted by admin
- **Backups:** Retain last 7 days (free tier manual only)
