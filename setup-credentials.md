# Quick Start: Setup Test Credentials

## ⚡ TL;DR - What You Need to Do

### 1. Create Auth Users in Supabase Console

Go to: https://supabase.com/dashboard/project/eyvmfcjpqkrxahsipqiv/auth/users

Click "Create user" twice:

- **admin@feinterview.dev** / `AdminPass123!`
- **interviewer@feinterview.dev** / `InterviewPass123!`

### 2. Add Interviewer Records

Go to: https://supabase.com/dashboard/project/eyvmfcjpqkrxahsipqiv/editor

First, get UUIDs:

```sql
SELECT id, email FROM auth.users WHERE email IN ('admin@feinterview.dev', 'interviewer@feinterview.dev');
```

Then insert:

```sql
INSERT INTO interviewers (id, email, name, created_at) VALUES
  ('ADMIN_UUID', 'admin@feinterview.dev', 'Admin User', now()),
  ('INTERVIEWER_UUID', 'interviewer@feinterview.dev', 'Interviewer', now());
```

### 3. Login & Create Candidate

1. Go to http://localhost:3000/login
2. Login: **admin@feinterview.dev** / `AdminPass123!`
3. Go to `/candidates` → Add Candidate
4. Name: `Test Candidate`, Experience: `Mid`, Skills: `React, JavaScript`

### 4. Create Job Description

Go to `/library` or dashboard:

- Title: `React Developer`
- Company: `Test Corp`
- Tech Stack: `React, Node.js`

### 5. Create Interview Session

1. Go to `/sessions/new`
2. Select: Candidate + Job
3. Languages: JavaScript, TypeScript
4. Expires: 30 minutes
5. **COPY THE CHALLENGE LINK**

### 6. Test Public Challenge

1. Open link in **incognito window**
2. No login needed ✅
3. See problem ✅
4. Write code ✅
5. Submit ✅

---

## Credentials Reference

```
Admin:
  Email: admin@feinterview.dev
  Password: AdminPass123!
  URL: http://localhost:3000/login

Interviewer:
  Email: interviewer@feinterview.dev
  Password: InterviewPass123!
  URL: http://localhost:3000/login

Public Challenge (NO LOGIN):
  URL: http://localhost:3000/challenge/[token]
```

---

## ✨ What You Have

✅ Public code ground (no login required)
✅ Shareable challenge links
✅ Real-time submission tracking
✅ Admin dashboard
✅ Time-boxed sessions

Total setup time: **~15 minutes**

See `CREDENTIALS_SETUP.md` for detailed steps.
