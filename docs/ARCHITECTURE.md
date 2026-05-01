# System Architecture

## Coding Challenge & Interview Platform

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────┐                           │
│  │   Admin Dashboard (React/Next.js)    │                           │
│  │  ├─ Candidate Management             │                           │
│  │  ├─ Job Description Management       │                           │
│  │  ├─ Session Management               │                           │
│  │  ├─ Question Library                 │                           │
│  │  └─ Code Analysis Dashboard          │                           │
│  └──────────────────────────────────────┘                           │
│                      │                                               │
│                      ▼                                               │
│  ┌──────────────────────────────────────┐                           │
│  │  Public Challenge Page (React/Next)  │                           │
│  │  ├─ Code Editor (Monaco/CodeMirror)  │                           │
│  │  ├─ Language Selector                │                           │
│  │  ├─ Challenge Description            │                           │
│  │  └─ Submit Button                    │                           │
│  └──────────────────────────────────────┘                           │
│                                                                      │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
                     │ HTTP + WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       API LAYER (Next.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Authentication Routes                                              │
│  ├─ POST /api/auth/login                                            │
│  ├─ POST /api/auth/logout                                           │
│  └─ GET /api/auth/session                                           │
│                                                                      │
│  Admin Management Routes                                            │
│  ├─ CRUD /api/candidates                                            │
│  ├─ CRUD /api/job-descriptions                                      │
│  ├─ CRUD /api/sessions                                              │
│  └─ GET /api/sessions/[id]                                          │
│                                                                      │
│  AI Integration Routes                                              │
│  ├─ POST /api/ai/generate-questions                                 │
│  └─ POST /api/ai/analyze-code                                       │
│                                                                      │
│  Public Challenge Routes (No Auth)                                  │
│  ├─ GET /api/challenge/[token]                                      │
│  └─ POST /api/challenge/[token]/submit                              │
│                                                                      │
│  Library Routes                                                     │
│  ├─ CRUD /api/questions                                             │
│  ├─ CRUD /api/code-snippets                                         │
│  └─ GET with filters (level, category, search)                      │
│                                                                      │
│  Real-Time Routes (WebSocket)                                       │
│  └─ /api/sessions/[id]/realtime                                     │
│                                                                      │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬───────────────────┐
        │            │            │                   │
        ▼            ▼            ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │   Gemini AI  │  │   Vercel     │  │ Supabase     │
│   Database   │  │   API        │  │   Hosting    │  │ Realtime     │
│ (PostgreSQL) │  │ (Google)     │  │              │  │ (WebSocket)  │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ Interviewers │  │ Question Gen │  │ Next.js App  │  │ Broadcasts   │
│ Candidates   │  │ Code Analysis│  │ Deployment   │  │ Updates      │
│ Job Desc     │  │ Streaming    │  │ Serverless   │  │              │
│ Sessions     │  │ Response     │  │ Functions    │  │              │
│ Questions    │  │              │  │              │  │              │
│ Snippets     │  │              │  │              │  │              │
│ Submissions  │  │              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 2. Frontend Component Structure

```
src/app/(admin)/          → Admin-only routes with auth protection
src/app/challenge/        → Public challenge route (token-based)
src/app/api/              → Next.js API routes (backend)
src/components/           → Reusable React components
src/lib/                  → Utilities, clients, hooks
src/types/                → TypeScript type definitions
src/middleware.ts         → Route protection & auth
```

---

## 3. Data Flow Patterns

### Question Generation Flow

Admin → Select candidate + JD + level → POST /api/ai/generate-questions → Build prompt → Gemini API → Parse response → Save to DB → Show in library

### Code Challenge Session Flow

Admin creates session (candidate + JD + languages + expiration) → Generate token → Create public link → Share with candidate → Candidate opens link → Writes code → Submits

### Real-Time Code Sync

Candidate submits → POST /api/challenge/{token}/submit → Save to DB → Supabase Realtime trigger → Broadcast to admin → Admin sees live update → Can trigger analysis

### Code Analysis Flow

Admin clicks "Analyze" → POST /api/ai/analyze-code → Gemini analyzes quality + performance + best practices → Generate follow-up Q's → Display results on dashboard

---

## 4. Technology Stack

**Frontend:** Next.js 14+ | React 18+ | Tailwind CSS | Monaco Editor | Supabase Realtime (WebSocket)

**Backend:** Next.js API Routes | Node.js (Vercel serverless)

**Database:** Supabase (PostgreSQL) | Supabase Realtime

**AI:** Google Gemini API

**Hosting:** Vercel (free tier)

**Auth:** Supabase Auth

---

## 5. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_GEMINI_API_KEY
NEXTAUTH_SECRET
NEXTAUTH_URL
```

---

## 6. Authentication Flow

Interviewer login → POST /api/auth/login → Validate credentials → Create JWT → Store in cookie → Middleware protects admin routes → Public challenge routes don't require auth (token-based only)

---

## 7. Scalability Path

**MVP (now):** Single admin, <100 sessions/month, free tier DBs

**Phase 2:** Multi-tenant, Redis caching, background jobs, advanced analytics, team management
