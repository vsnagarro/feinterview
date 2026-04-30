Deployment and seeding guide

1) Create Supabase project (free tier)
   - Run SQL Editor and execute files in supabase/migrations in order:
     - initial.sql
     - seed.sql
   - Alternatively install supabase CLI and run:
     - supabase db reset --project-ref <ref> && supabase db push
     - Use `supabase sql` to run the migration files.

2) Set environment variables (Vercel or local .env.local)
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - NEXT_PUBLIC_APP_URL (e.g., https://your-app.vercel.app)
   - SUPABASE_SERVICE_ROLE_KEY (server-only)
   - ANTHROPIC_API_KEY and/or OPENAI_API_KEY (server-only)

3) Local dev
   - npm install
   - cp .env.example .env.local && fill values
   - npm run dev

4) Vercel deploy
   - Push repo to GitHub
   - Import project in Vercel
   - Add the environment variables in Vercel dashboard (Production & Preview)
   - Deploy

5) Notes on AI and server-only keys
   - API routes that call AI or use SUPABASE_SERVICE_ROLE_KEY already use server-only helpers (src/lib/supabase/server.ts)
   - Keep service role and AI keys secret (do NOT use NEXT_PUBLIC_ prefix)

6) Realtime
   - Supabase Realtime should be enabled by default on hosted projects. Ensure "Realtime" is active in project settings.

7) Troubleshooting
   - If subscriptions don't work locally, check firewall or CORS and ensure correct keys are used.
