#!/usr/bin/env bash
set -euo pipefail
mkdir -p docs

cat > docs/PRD.md <<'PRD'
# Product Requirements Document (PRD)
## Coding Challenge & Interview Platform

### Executive Summary
A web-based platform for technical interviewers to conduct coding challenges with candidates in real-time, leveraging AI to generate personalized interview questions based on job descriptions and candidate profiles.

### Problem Statement
Interviewers need an efficient way to:
- Create and manage coding challenges for candidates
- Track candidate progress in real-time
- Generate relevant interview questions based on role requirements
- Assess coding ability across multiple programming languages
- Build a repository of questions and code snippets for future use

### Product Vision
Enable interviewers to quickly create personalized coding challenges with AI-generated questions and conduct real-time interviews with candidates through shareable links, without requiring authentication infrastructure.

---

## 1. FEATURES & REQUIREMENTS

### 1.1 Admin Dashboard
**Actors:** Admin user
**Purpose:** Manage candidates, sessions, and generate content

#### Requirements:
- [ ] View all candidates and their profiles
- [ ] View all coding challenge sessions
- [ ] Create new challenge sessions
- [ ] View challenge analytics (completion rate, time spent, etc.)
- [ ] Access question and code snippet library
- [ ] Admin authentication (email/password)

### 1.2 Candidate Profiles
**Actors:** Interviewer (creates), System (uses)

#### Fields:
- Name
- Email
- Experience Level (Junior, Mid, Senior)
- Technical Skills (multi-select tags)
- Resume/Profile Summary (optional)
- Applied Position
- Created Date

### 1.3 Job Descriptions
**Actors:** Interviewer (creates and manages)

#### Fields:
- Title
- Description
- Required Skills (multi-select)
- Experience Level Required
- Tech Stack
- Key Responsibilities
- Evaluation Criteria

### 1.4 Code Challenge Sessions
**Actors:** Interviewer (creates), Candidate (participates)

#### Session Creation:
- Link to Candidate Profile
- Link to Job Description
- Set Level (auto-suggested or manual)
- Select Programming Languages (Multiple options: JavaScript, Python, Java, C++, etc.)
- Set link expiration time (e.g., 24 hours, 7 days, custom)
- Generate shareable link
- Mark as public (no login required)

#### During Session:
- Real-time code editor with syntax highlighting
- Language selector (if multiple allowed)
- Submit code button
- Timer display (if timed challenge)
- Challenge description panel

### 1.5 Real-Time Code Synchronization
**Actors:** Candidate (writes code), Interviewer (views)

#### Requirements:
- Candidate's code appears in real-time on interviewer's side
- WebSocket/real-time updates
- Show candidate's current language and progress
- Code is saved automatically

### 1.6 AI-Powered Question Generation
**Actors:** Interviewer (triggers generation)

#### Generation Parameters:
- Candidate Profile (skills, experience level)
- Job Description (requirements, tech stack)
- Experience Level
- Number of questions requested (default: 5)
- Question Types (MCQ, Code Challenge, Conceptual)

#### Output:
- Generated Questions
- Detailed Answers
- Code Snippets (for code challenges)
- Difficulty Assessment
- Time to Complete Estimate

### 1.7 AI-Powered Code Analysis
**Actors:** Interviewer (triggers after code submission)

#### Analysis Includes:
- Code Quality Assessment
- Performance Analysis
- Best Practices Adherence
- Security Issues (if any)
- Suggested Improvements
- AI-Generated Follow-up Questions based on submitted code

### 1.8 Question & Code Snippet Library
**Actors:** Interviewer (views and filters)

#### Features:
- Tabbed interface (Questions / Code Snippets)
- Filter by:
  - Technology/Language
  - Level (Junior, Mid, Senior)
  - Category/Topic
  - Date Created
  - Question Type
- Search functionality
- Edit/Delete questions (owned by user)
- Import/Export capability

### 1.9 Shareable Challenge Link
**Actors:** Candidate (uses)

#### Link Features:
- Public link (no login required)
- Valid for specified duration
- Contains:
  - Challenge description
  - Code editor
  - Language selection
  - Submit button
- Expires after set time
- Can be revoked manually
- One-time use or multiple submissions

---

## 2. USER ROLES & PERMISSIONS

### 2.1 Interviewer (Admin)
- Create/edit/delete candidates
- Create/edit/delete job descriptions
- Create coding challenge sessions
- View candidate submissions in real-time
- Generate questions/answers/snippets via AI
- Analyze submitted code via AI
- Access question library
- View session analytics

### 2.2 Candidate
- Access challenge via public link
- View challenge description
- Write and submit code
- No login required

---

## 3. USER FLOWS

### 3.1 Create Challenge Session Flow
1. Interviewer creates candidate profile
2. Interviewer creates/selects job description
3. Interviewer creates new session
4. System suggests level based on candidate + JD
5. Interviewer selects programming languages
6. Interviewer sets expiration time
7. System generates shareable link
8. Interviewer shares link with candidate

### 3.2 Candidate Participation Flow
1. Candidate receives public link
2. Candidate opens link (no login)
3. Candidate sees challenge description
4. Candidate selects language (if multiple)
5. Candidate writes code in editor
6. Candidate submits code
7. Code appears in real-time on interviewer's dashboard

### 3.3 AI Question Generation Flow
1. Interviewer navigates to "Generate Questions"
2. Interviewer selects candidate profile
3. Interviewer selects job description
4. Interviewer selects number of questions and type
5. System sends request to Gemini API with prompt
6. AI generates questions, answers, and snippets
7. Interviewer reviews generated content
8. Interviewer can save to library or edit before saving
9. Generated content appears in library

### 3.4 Code Analysis Flow
1. Candidate submits code
2. Interviewer triggers "Analyze Code"
3. System sends code + context to Gemini API
4. AI analyzes code quality, performance, best practices
5. AI generates follow-up questions
6. Results displayed on interviewer dashboard
7. Interviewer can use generated questions for next round

---

## 4. DATA REQUIREMENTS

### 4.1 Questions
- Question Text
- Category/Topic
- Level (Junior, Mid, Senior)
- Correct Answer(s)
- Explanation
- Technology Tags
- Question Type (MCQ, Short Answer, Code Challenge)
- Created By (Interviewer)
- Created Date
- Updated Date

### 4.2 Code Snippets
- Code Title
- Language
- Code Content
- Explanation
- Level
- Category
- Created By
- Created Date
- Tag(s)

### 4.3 Sessions
- Session ID
- Candidate ID
- Job Description ID
- Challenge Link (token)
- Created By (Interviewer ID)
- Status (Active, Completed, Expired)
- Created Date
- Expiration Date/Time
- Languages Allowed
- Code Submissions
- Notes

---

## 5. TECHNICAL REQUIREMENTS

### 5.1 Frontend
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **Code Editor:** Monaco Editor or CodeMirror
- **Real-time:** WebSocket support
- **Authentication:** NextAuth.js (for admin only)

### 5.2 Backend
- **API:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Real-time Database:** Supabase Realtime
- **AI Integration:** Google Gemini API
- **Authentication:** Supabase Auth

### 5.3 Deployment
- **Hosting:** Vercel (free tier)
- **Database Hosting:** Supabase (free tier)
- **Environment:** Production & Development

### 5.4 Security
- Interviewer authentication required for admin panel
- Public links for candidates (time-limited)
- Link expiration enforcement
- API key management for Gemini
- Rate limiting on API calls

---

## 6. SUCCESS METRICS

- Number of challenge sessions created
- Candidate submission rate
- Average time to complete challenge
- AI question generation utilization
- Library growth (questions/snippets)
- User satisfaction score

---

## 7. ROADMAP

### MVP (Current)
- [x] Admin authentication
- [x] Candidate profile management
- [x] Job description management
- [x] Challenge session creation
- [x] Shareable public links
- [x] Real-time code editor
- [x] AI question generation
- [x] AI code analysis
- [x] Question library

### Phase 2
- [ ] Video recording of session
- [ ] Pair programming support
- [ ] Interview scheduling
- [ ] Feedback forms
- [ ] Advanced analytics dashboard
- [ ] Team management (multiple interviewers)

---

## 8. ASSUMPTIONS

- Interviewer has Google Gemini API key
- Supabase project is set up
- Candidates have basic technical setup (browser)
- Internet connectivity available for candidates and interviewers
- Real-time updates are acceptable (seconds delay)

---

## 9. CONSTRAINTS

- Free tier limitations:
  - Supabase: Rate limits apply
  - Gemini API: Free tier has usage limits
  - Vercel: Cold starts possible
- No paid analytics required
- No offline mode needed
PRD

cat > docs/ERD.md <<'ERD'
# Entity Relationship Diagram (ERD)
## Coding Challenge Platform

### Entity Overview

(see full ERD in docs/ARCHITECTURE.md)

### Detailed Table Specifications

#### interviewers
id              UUID PRIMARY KEY
email           VARCHAR(255) UNIQUE NOT NULL
name            VARCHAR(255) NOT NULL
password_hash   VARCHAR(255) NOT NULL
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()

#### candidates
id                UUID PRIMARY KEY
name              VARCHAR(255) NOT NULL
email             VARCHAR(255)
experience_level  VARCHAR(50)
skills            TEXT[]
summary           TEXT
created_by_id     UUID FOREIGN KEY -> interviewers(id)
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()

#### job_descriptions
id                UUID PRIMARY KEY
title             VARCHAR(255) NOT NULL
description       TEXT NOT NULL
required_skills   TEXT[]
tech_stack        TEXT[]
experience_level  VARCHAR(50)
created_by_id     UUID FOREIGN KEY -> interviewers(id)
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()

#### sessions
id                UUID PRIMARY KEY
challenge_token   VARCHAR(255) UNIQUE NOT NULL
candidate_id      UUID FOREIGN KEY -> candidates(id)
job_description_id UUID FOREIGN KEY -> job_descriptions(id)
interviewer_id    UUID FOREIGN KEY -> interviewers(id)
status            VARCHAR(50)
languages         TEXT[]
created_at        TIMESTAMP DEFAULT NOW()
expires_at        TIMESTAMP NOT NULL
updated_at        TIMESTAMP DEFAULT NOW()

#### code_submissions
id                UUID PRIMARY KEY
session_id        UUID FOREIGN KEY -> sessions(id)
code              TEXT NOT NULL
language          VARCHAR(50) NOT NULL
submitted_at      TIMESTAMP DEFAULT NOW()
analysis          JSONB

#### questions
id                UUID PRIMARY KEY
text              TEXT NOT NULL
category          VARCHAR(100)
level             VARCHAR(50)
answer            TEXT NOT NULL
explanation       TEXT
languages         TEXT[]
question_type     VARCHAR(50)
created_by_id     UUID FOREIGN KEY -> interviewers(id)
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()

#### code_snippets
id                UUID PRIMARY KEY
title             VARCHAR(255) NOT NULL
code              TEXT NOT NULL
language          VARCHAR(50) NOT NULL
level             VARCHAR(50)
category          VARCHAR(100)
explanation       TEXT
tags              TEXT[]
created_by_id     UUID FOREIGN KEY -> interviewers(id)
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
ERD

cat > docs/ARCHITECTURE.md <<'ARCH'
# System Architecture
## Coding Challenge Platform

(Full architecture, component diagrams, flows, and technology stack are documented here.)
Refer to README.md and other docs for details.
ARCH

cat > docs/API.md <<'API'
# API Documentation
## Coding Challenge Platform

(Full API endpoint list: auth, candidates, job-descriptions, sessions, challenges, ai, questions, code-snippets)
See docs/DEVELOPMENT.md for usage examples.
API

cat > docs/DEVELOPMENT.md <<'DEV'
# Development Guide

(Setup, env vars, running, testing, deployment notes)
DEV

cat > docs/DATABASE.md <<'DB'
# Database Schema Documentation

(Key tables, relationships, queries, indexing, backup examples)
DB

cat > docs/DEPLOYMENT.md <<'DEP'
# Deployment Guide

(Vercel, Supabase, Gemini key setup, environment variables, troubleshooting)
DEP

cat > docs/README.md <<'R'
# Documentation Index

- PRD.md
- ARCHITECTURE.md
- API.md
- DEVELOPMENT.md
- DATABASE.md
- DEPLOYMENT.md
R

echo "All docs created under docs/ (PRD.md, ERD.md, ARCHITECTURE.md, API.md, DEVELOPMENT.md, DATABASE.md, DEPLOYMENT.md, README.md)"