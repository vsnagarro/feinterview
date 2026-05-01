# Deployment Guide

## Coding Challenge & Interview Platform

---

## Prerequisites

- GitHub repository with code
- Supabase project (created and schema set up)
- Google Gemini API key
- Vercel account (free or paid)

---

## Step 1: Prepare Supabase

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Select organization and enter project name
4. Create a strong database password
5. Select region closest to you
6. Wait for project to initialize (5-10 min)

### 1.2 Run Database Migrations

1. Go to "SQL Editor"
2. Create new query
3. Copy & paste migrations from `supabase/migrations/`
4. Execute each migration

Or use CLI:

```bash
supabase migration up
```

### 1.3 Enable Realtime

1. Go to "Database" → "Replication"
2. Enable for tables:
   - `sessions`
   - `code_submissions`
3. Save

### 1.4 Note Down Keys

Go to "Settings" → "API" and copy:

- `SUPABASE_URL` (under "API Settings")
- `SUPABASE_ANON_KEY` (anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (service role key)

---

## Step 2: Get Google Gemini API Key

1. Go to [ai.google.dev](https://ai.google.dev)
2. Click "Get API Key in Google Cloud Console"
3. Create new project or select existing
4. Generate API key
5. Enable Google Generative AI API
6. Copy and securely store the key

---

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub

1. Go to [vercel.com](https://vercel.com)
2. Sign up / log in
3. Click "New Project"
4. Select "Import Git Repository"
5. Connect GitHub account
6. Select your `fe-interview` repo
7. Click "Import"

### 3.2 Configure Environment Variables

1. On import page, find "Environment Variables" section
2. Add the following:

| Variable                      | Value                            | Note                                |
| ----------------------------- | -------------------------------- | ----------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | https://[project].supabase.co    | From Supabase                       |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | [anon_key]                       | From Supabase                       |
| SUPABASE_SERVICE_ROLE_KEY     | [service_role_key]               | From Supabase (keep secret!)        |
| GOOGLE_GEMINI_API_KEY         | [api_key]                        | From Google                         |
| NEXTAUTH_SECRET               | [random_string]                  | Generate: `openssl rand -base64 32` |
| NEXTAUTH_URL                  | https://[your-domain].vercel.app | Set after deployment                |

3. Click "Deploy"

### 3.3 Wait for Build & Deployment

- Build logs will show progress
- Deployment completes in 2-5 minutes
- Copy the production URL (e.g., `https://fe-interview.vercel.app`)

### 3.4 Update NEXTAUTH_URL

1. Go to Vercel project settings
2. Find "Environment Variables"
3. Update `NEXTAUTH_URL` to your production URL
4. Redeploy

---

## Step 4: Verify Deployment

### 4.1 Check Application

1. Visit `https://your-domain.vercel.app`
2. Navigate to `/admin/login`
3. Login with Supabase credentials

### 4.2 Test Features

- [ ] Create candidate
- [ ] Create job description
- [ ] Create challenge session (should generate public link)
- [ ] Generate questions with AI
- [ ] Open public challenge link in incognito
- [ ] Submit code from public link
- [ ] Check real-time sync on admin side
- [ ] Analyze code with AI

### 4.3 Check Logs

Go to Vercel dashboard → Deployments → View Logs

---

## Step 5: Configure Continuous Deployment

Vercel automatically deploys on:

- Push to main branch
- Merge PR to main

To customize:

1. Vercel Dashboard → Settings → Git
2. Set Production branch to `main`
3. Enable "Automatic deployments"

---

## Environment Variables Reference

### Required Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_ROLE_KEY=[service_role_key]
GOOGLE_GEMINI_API_KEY=[api_key]
NEXTAUTH_SECRET=[random_secret]
NEXTAUTH_URL=https://your-domain.vercel.app
```

### Optional Variables

```env
NODE_ENV=production
```

---

## Monitoring & Logs

### Vercel Logs

- Go to Deployments → View Logs
- See build output and runtime errors

### Supabase Logs

- Supabase Dashboard → Logs
- View database, auth, and storage logs

### Google Cloud Logs

- Google Cloud Console → Logs
- View Gemini API usage and errors

---

## Troubleshooting

### 500 Error on Admin Panel

**Cause:** Missing or incorrect environment variables

**Solution:**

1. Check Vercel env vars are set
2. Verify SUPABASE_URL format
3. Check NEXTAUTH_SECRET is set
4. Redeploy

### Cannot Connect to Database

**Cause:** Wrong Supabase URL or keys

**Solution:**

1. Double-check URL from Supabase dashboard
2. Verify keys (anon vs service role)
3. Test connection in Supabase SQL editor
4. Update env vars and redeploy

### AI Endpoints Fail

**Cause:** Invalid Gemini API key or rate limit exceeded

**Solution:**

1. Verify API key is correct
2. Check free tier limits (60 req/min)
3. Wait before retrying
4. Monitor usage in Google Cloud Console

### Real-Time Updates Not Working

**Cause:** Realtime not enabled in Supabase

**Solution:**

1. Go to Supabase Dashboard
2. Database → Replication
3. Enable for sessions and code_submissions
4. Refresh browser

### Public Challenge Link Returns 404

**Cause:** Session expired or invalid token

**Solution:**

1. Check session expires_at in database
2. Verify challenge_token is correct
3. Regenerate session if expired

---

## Performance & Scaling

### Current (MVP)

- Vercel free tier: 1 concurrent function
- Supabase free tier: 500MB storage, 2GB bandwidth/month
- Gemini free tier: 60 requests/minute

### Monitor Usage

1. **Vercel:** Deployments → Analytics
2. **Supabase:** Database → Query Performance
3. **Google Cloud:** Gemini API → Quotas & Metrics

### Scale When Needed

- Upgrade Vercel to Pro ($20/month) for higher concurrency
- Upgrade Supabase for more storage/bandwidth
- Request Gemini quota increase

---

## Rollback

### Quick Rollback

1. Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Full Rollback

```bash
git revert <commit-hash>
git push origin main
```

Vercel will auto-deploy the reverted code.

---

## Database Backup

### Before Major Changes

1. Supabase Dashboard → Settings → Backups
2. Click "Create Backup"
3. Wait for backup to complete

### Recovery

Contact Supabase support or manually restore from backup SQL.

---

## Domain Setup (Optional)

If using custom domain:

1. Vercel Dashboard → Settings → Domains
2. Add your domain
3. Update DNS records (Vercel will provide instructions)
4. Update `NEXTAUTH_URL` environment variable
5. Redeploy

---

## Summary Checklist

- [ ] Supabase project created and migrations run
- [ ] Realtime enabled for key tables
- [ ] Supabase URL and keys copied
- [ ] Google Gemini API key obtained
- [ ] Vercel project created and GitHub connected
- [ ] All environment variables set
- [ ] NEXTAUTH_URL configured
- [ ] Deployment successful
- [ ] All features tested
- [ ] No errors in logs
- [ ] Public challenge link working
- [ ] AI endpoints functional
