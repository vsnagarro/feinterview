# Test Credentials Setup Guide

## Step 1: Create Auth Users in Supabase

Go to: https://supabase.com/dashboard/project/eyvmfcjpqkrxahsipqiv/auth/users

### Create Admin User

- Email: `admin@feinterview.dev`
- Password: `AdminPass123!`
- Click "Create user"

### Create Interviewer User

- Email: `interviewer@feinterview.dev`
- Password: `InterviewPass123!`
- Click "Create user"

---

## Step 2: Create Interviewer Records in Database

Go to: https://supabase.com/dashboard/project/eyvmfcjpqkrxahsipqiv/editor

**First, get the UUIDs:**

```sql
SELECT id, email FROM auth.users WHERE email IN ('admin@feinterview.dev', 'interviewer@feinterview.dev');
```

**Then insert records:**

```sql
INSERT INTO interviewers (id, email, name, created_at) VALUES
  ('PASTE_ADMIN_UUID_HERE', 'admin@feinterview.dev', 'Admin User', now()),
  ('PASTE_INTERVIEWER_UUID_HERE', 'interviewer@feinterview.dev', 'Test Interviewer', now());
```

---

## Step 3: Create Sample Candidate

1. Go to http://localhost:3000/login
2. Login with: **admin@feinterview.dev** / `AdminPass123!`
3. Navigate to `/candidates`
4. Click "Add Candidate" button
5. Fill in:
   - Name: `Test Candidate`
   - Email: `candidate@test.dev`
   - Experience: `Mid`
   - Skills: `React, JavaScript, Node.js`
6. Click "Create Candidate"

---

## Step 4: Create Sample Job Description

1. Go to `/library` or dashboard
2. Create Job Description:
   - Title: `Frontend React Developer`
   - Company: `Test Corp`
   - Description: `Build React components`
   - Required Skills: `React, JavaScript, CSS`
   - Tech Stack: `React, Next.js, Tailwind`
   - Experience Level: `Mid`

---

## Step 5: Create Interview Session

1. Login as admin (admin@feinterview.dev)
2. Go to `/sessions/new`
3. Fill form:
   - Candidate: `Test Candidate`
   - Job Description: `Frontend React Developer`
   - Languages: Check `JavaScript`, `TypeScript`
   - Expires in: `30` minutes
4. Click "Create Session"
5. **COPY THE GENERATED CHALLENGE LINK** (looks like: `http://localhost:3000/challenge/abc-123-xyz`)

---

## Step 6: Test Public Challenge Page

1. **Open challenge link in INCOGNITO/PRIVATE window** (do NOT login)
2. Verify page loads without login ✅
3. See problem statement ✅
4. Monaco editor loads ✅
5. Type some code ✅
6. Select language ✅
7. Click submit ✅
8. Get confirmation ✅

---

## Test Account Summary

| Role        | Email                       | Password          | Login URL                               |
| ----------- | --------------------------- | ----------------- | --------------------------------------- |
| Admin       | admin@feinterview.dev       | AdminPass123!     | http://localhost:3000/login             |
| Interviewer | interviewer@feinterview.dev | InterviewPass123! | http://localhost:3000/login             |
| Candidate   | (public link)               | (no login)        | http://localhost:3000/challenge/[token] |

---

## Verification Checklist

- [ ] Created admin auth user
- [ ] Created interviewer auth user
- [ ] Created interviewer database records
- [ ] Created test candidate
- [ ] Created job description
- [ ] Created interview session
- [ ] Copied challenge link
- [ ] Tested public access (incognito)
- [ ] Submitted code
- [ ] Verified submission in admin dashboard

---

Done! Your platform is ready to test. 🚀
