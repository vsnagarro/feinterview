# Development Guide

## Coding Challenge & Interview Platform

---

## Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn** (npm recommended)
- **Git** for version control
- **Supabase** account (free tier)
- **Google Gemini API** key (free tier)
- **Vercel** account (optional, for deployment)
- **VS Code** or any code editor

---

## Local Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd fe-interview
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Gemini API
GOOGLE_GEMINI_API_KEY=<your-api-key>

# Auth
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Access Admin Panel

- Go to: `http://localhost:3000/admin/login`
- Login with your Supabase user credentials
- Or create an account via Supabase Auth dashboard

---

## Project Structure

```
fe-interview/
├── src/
│   ├── app/
│   │   ├── (admin)/              # Protected admin routes
│   │   │   ├── dashboard/
│   │   │   ├── candidates/
│   │   │   ├── job-descriptions/
│   │   │   ├── sessions/
│   │   │   ├── library/
│   │   │   └── login/
│   │   ├── challenge/[token]/    # Public challenge page
│   │   ├── api/                  # Backend API routes
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx              # Homepage
│   ├── components/               # Reusable React components
│   ├── lib/                      # Utilities, clients, hooks
│   ├── types/                    # TypeScript definitions
│   └── middleware.ts             # Route protection
├── supabase/
│   └── migrations/               # Database migrations
├── docs/                         # Documentation
├── public/                       # Static assets
├── .env.example                  # Example env vars
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── eslint.config.js
```

---

## Database Setup

### 1. Supabase Project

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run migrations from `supabase/migrations/`

Or run via CLI:

```bash
supabase migration up
```

### 2. Enable Realtime

In Supabase dashboard:

- Go to Replication
- Enable realtime for tables: `sessions`, `code_submissions`

---

## Development Workflow

### Creating a New Feature

1. **Create feature branch**

   ```bash
   git checkout -b feature/feature-name
   ```

2. **Add API route** (`src/app/api/...`)

   ```typescript
   export async function POST(req: Request) {
     try {
       const body = await req.json();
       // Validate & process
       return Response.json({ success: true });
     } catch (error) {
       return Response.json({ error: error.message }, { status: 400 });
     }
   }
   ```

3. **Create component** (`src/components/...`)

   ```typescript
   export function MyComponent() {
     return <div>Hello</div>;
   }
   ```

4. **Add types** (`src/types/...`)

   ```typescript
   export interface Candidate {
     id: string;
     name: string;
     email: string;
   }
   ```

5. **Test locally**

   ```bash
   npm run dev
   # Test via browser or Postman
   ```

6. **Commit & push**

   ```bash
   git add .
   git commit -m "feat: add feature-name"
   git push origin feature/feature-name
   ```

7. **Create PR** on GitHub

### Database Migrations

1. **Edit SQL migration** in `supabase/migrations/`

   ```sql
   -- supabase/migrations/0002_add_new_table.sql
   CREATE TABLE new_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **Apply locally**

   ```bash
   supabase migration up
   ```

3. **Test in Supabase Studio** (dashboard)

4. **Commit migration** to git

### AI Integration

Modify prompts in `src/lib/ai/prompts.ts`:

```typescript
export const generateQuestionsPrompt = (candidate, jobDesc, level) => `
You are an expert interviewer. Generate 5 interview questions for a ${level} ${jobDesc.title} position.
Candidate skills: ${candidate.skills.join(", ")}
...
`;
```

---

## Testing

### Manual Testing (Recommended for MVP)

1. **Test flow via browser**
   - Login to admin
   - Create candidate
   - Create job description
   - Create session & generate link
   - Open public link in incognito
   - Submit code
   - Check real-time sync on admin side

2. **Test API with curl**

   ```bash
   curl -X POST http://localhost:3000/api/candidates \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@example.com"}'
   ```

3. **Test with Postman**
   - Import API docs
   - Set env vars
   - Test endpoints

### Unit Tests (Optional)

```bash
npm run test
```

---

## Common Development Tasks

### Add a New Question to Library

1. POST `/api/questions` with question details
2. Question appears in library

### Generate Questions with AI

1. Admin selects candidate + JD
2. Click "Generate Questions"
3. POST `/api/ai/generate-questions`
4. Review & save to library

### Monitor Real-Time Updates

1. Open admin session view
2. Candidate submits code from public link
3. Code appears live on admin dashboard
4. Realtime working if updates instant

---

## Troubleshooting

### Supabase Connection Error

**Problem:** "Cannot connect to Supabase"

**Solution:**

- Check `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- Verify Supabase project is running
- Check CORS settings in Supabase

### Gemini API Error

**Problem:** "Invalid API key" or rate limit

**Solution:**

- Verify `GOOGLE_GEMINI_API_KEY` is correct
- Check free tier limits (60 req/min)
- Wait before retrying

### Real-Time Not Working

**Problem:** Code updates not showing live

**Solution:**

- Ensure Supabase Realtime is enabled
- Check database subscriptions in browser DevTools
- Verify WebSocket connection

### Database Migration Failed

**Problem:** "Migration failed"

**Solution:**

- Check SQL syntax
- Ensure tables don't already exist
- Test in Supabase SQL editor first

---

## Performance Tips

1. **Code Editor:** Monaco is heavy; consider code-splitting
2. **Database:** Add indexes to frequently queried columns
3. **API:** Cache static data (job descriptions, popular questions)
4. **Images:** Use `next/image` for optimization
5. **Components:** Use React.memo for expensive renders

---

## Security Best Practices

- [ ] Validate all user inputs
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting on sensitive endpoints
- [ ] Sanitize code before display (XSS prevention)
- [ ] Use HTTPS only (Vercel handles this)
- [ ] Check Supabase Row Level Security (RLS) policies
- [ ] Log errors but don't expose internal details

---

## Useful Commands

```bash
# Development
npm run dev                  # Start dev server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run linter

# Database
supabase status            # Check Supabase status
supabase migration list    # List migrations
supabase migration up      # Apply migrations

# Git
git status                 # Check changes
git add .                  # Stage all changes
git commit -m "message"    # Commit changes
git push origin branch     # Push to GitHub
```

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.io/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
