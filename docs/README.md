# Coding Challenge Platform - Complete Documentation

Welcome! This folder contains comprehensive documentation for the Coding Challenge & Interview Platform.

---

## 📋 Documentation Files

### [PRD.md](PRD.md) - Product Requirements Document

**What to read:** Understand what the application does, what features exist, user roles, and data requirements.

**Key sections:**

- Executive summary & vision
- Feature requirements (1.1 - 1.9)
- User flows (how features work)
- Data requirements
- Technical stack
- Roadmap

---

### [ERD.md](ERD.md) - Entity Relationship Diagram

**What to read:** Understand the database structure and how tables relate to each other.

**Key sections:**

- Entity overview diagram
- Detailed table specifications
- Relationships between tables
- Example queries

---

### [ARCHITECTURE.md](ARCHITECTURE.md) - System Architecture

**What to read:** Understand how all components work together, from frontend to backend to external services.

**Key sections:**

- High-level architecture diagram
- Frontend component structure
- Data flow patterns (question generation, code submission, real-time sync, analysis)
- Technology stack
- Environment configuration
- Security & scalability considerations

---

### [API.md](API.md) - REST API Documentation

**What to read:** Reference for all API endpoints, request/response formats, and error codes.

**Key sections:**

- Authentication endpoints
- Candidate CRUD endpoints
- Job description endpoints
- Session endpoints (challenge creation)
- Public challenge endpoints (no auth)
- Question & snippet endpoints
- AI integration endpoints (generate questions, analyze code)
- WebSocket real-time endpoints
- Error responses & rate limiting

---

### [DEVELOPMENT.md](DEVELOPMENT.md) - Local Development Guide

**What to read:** How to set up your local environment and run the application for development.

**Key sections:**

- Prerequisites (Node, npm, git, Supabase, Gemini API)
- Step-by-step local setup
- Project structure walkthrough
- Database setup instructions
- Development workflow (creating features, migrations, testing)
- Common tasks
- Troubleshooting
- Useful commands

---

### [DATABASE.md](DATABASE.md) - Database Schema Documentation

**What to read:** Detailed specifications of all database tables, indexes, and query examples.

**Key sections:**

- Overview of Supabase setup
- All 7 table schemas (interviewers, candidates, job_descriptions, sessions, code_submissions, questions, code_snippets)
- Entity relationships diagram
- Example queries for common operations
- Backup & recovery instructions
- Row Level Security (RLS) examples
- Performance optimization tips

---

### [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment & Hosting Guide

**What to read:** How to deploy the application to production (Vercel + Supabase).

**Key sections:**

- Supabase project setup
- Google Gemini API key setup
- Vercel deployment steps
- Environment variables configuration
- Verification & testing
- Monitoring & logs
- Troubleshooting common issues
- Scaling guidance
- Rollback procedures

---

## 🚀 Quick Start

### For First-Time Developers

1. Read: **PRD.md** (5 min) - understand the product
2. Read: **ARCHITECTURE.md** (5 min) - understand how it works
3. Follow: **DEVELOPMENT.md** (20 min) - set up locally
4. Code: Create a feature

### For Backend Developers

1. Read: **API.md** - all endpoints
2. Read: **DATABASE.md** - schema details
3. Reference: **DEVELOPMENT.md** - how to test

### For Frontend Developers

1. Read: **ARCHITECTURE.md** - component structure
2. Read: **API.md** - endpoint contracts
3. Reference: **DEVELOPMENT.md** - setup & testing

### For DevOps/Deployment

1. Read: **DEPLOYMENT.md** - production setup
2. Reference: **ARCHITECTURE.md** - tech stack
3. Check: **DATABASE.md** - backup procedures

---

## 🏗️ Project Overview

**Goal:** AI-powered coding challenge platform for technical interviews

**Users:**

- **Interviewers (Admins):** Create candidates, jobs, and challenges; generate questions with AI; analyze submissions
- **Candidates:** Take challenges via public links; write and submit code (no login required)

**Key Features:**

- ✅ Admin authentication & dashboard
- ✅ Candidate profile management
- ✅ Job description management
- ✅ Time-limited public challenge links
- ✅ Real-time code editor with syntax highlighting
- ✅ Real-time code submission sync to admin dashboard
- ✅ AI-powered question generation (Gemini API)
- ✅ AI-powered code analysis & follow-up questions
- ✅ Question & code snippet library
- ✅ Free tier (Vercel, Supabase, Gemini)

---

## 💡 Technology Stack

| Layer           | Technology                     |
| --------------- | ------------------------------ | --------------------------- | ------------ |
| **Frontend**    | Next.js 14+                    | React 18+                   | Tailwind CSS |
| **Code Editor** | Monaco Editor (VS Code engine) |
| **Backend**     | Next.js API Routes             | Node.js (Vercel serverless) |
| **Database**    | Supabase (PostgreSQL)          |
| **Real-time**   | Supabase Realtime (WebSocket)  |
| **AI**          | Google Gemini API              |
| **Hosting**     | Vercel (global CDN)            |
| **Auth**        | Supabase Auth                  |

---

## 📂 File Structure

```
fe-interview/
├── src/app/                 # Next.js App Router
│   ├── (admin)/             # Protected admin routes
│   ├── challenge/           # Public challenge route
│   ├── api/                 # API endpoints
│   └── page.tsx             # Homepage
├── src/components/          # React components
├── src/lib/                 # Utilities, clients, hooks
├── src/types/               # TypeScript definitions
├── supabase/migrations/     # Database migrations
├── docs/                    # Documentation (this folder)
└── [config files]           # package.json, tsconfig, etc.
```

---

## 🔄 Common Workflows

### Create a New Feature

1. Create feature branch: `git checkout -b feature/name`
2. Add API route in `src/app/api/`
3. Add component in `src/components/`
4. Add types in `src/types/`
5. Test locally: `npm run dev`
6. Commit & push: `git push origin feature/name`
7. Create PR on GitHub

### Add Questions to Library

1. Manual: POST `/api/questions` with question details
2. AI-generated: POST `/api/ai/generate-questions` with candidate + JD

### Deploy to Production

1. All code on main branch
2. Vercel automatically deploys
3. Verify at production URL

---

## 📞 Support & Troubleshooting

**Database Issues?** → See [DATABASE.md](DATABASE.md#troubleshooting)

**Local Setup Problems?** → See [DEVELOPMENT.md](DEVELOPMENT.md#troubleshooting)

**Deployment Issues?** → See [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)

**API Questions?** → See [API.md](API.md)

**Architecture Questions?** → See [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 📝 Documentation Maintenance

- Update docs when adding new features
- Keep API.md in sync with actual endpoints
- Update DEVELOPMENT.md setup steps if dependencies change
- Add troubleshooting entries when bugs are found & fixed

---

## 🎯 Next Steps

1. **Start Development:** Follow [DEVELOPMENT.md](DEVELOPMENT.md)
2. **Deploy:** Follow [DEPLOYMENT.md](DEPLOYMENT.md)
3. **Reference API:** Use [API.md](API.md) while building
4. **Query Database:** Use [DATABASE.md](DATABASE.md) for schema details
