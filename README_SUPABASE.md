Supabase & local setup

1) Create a Supabase project (https://app.supabase.com) and get the URL and anon key.
2) In project settings, enable the SQL Editor and run:
   - supabase/migrations/initial.sql
   - supabase/migrations/seed.sql
3) Add env vars to your Vercel/Netlify or local .env:
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (server-only, keep secret)

4) Start dev server:
   npm install
   npm run dev

Notes:
- The client uses the public anon key for reading/writing. For AI generation or administrative server-only actions, use an API route that uses SUPABASE_SERVICE_ROLE_KEY out-of-band.
- Realtime subscriptions rely on Supabase Realtime; ensure Realtime is enabled (default in hosted Supabase).