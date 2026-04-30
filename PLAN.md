Project plan (short)

Goal: Build a lightweight interview question/challenge app with:
- Admin: manage/generate Q&A/snippets via AI, create shareable challenges
- Candidate: open share link, edit/run code, submit; realtime sync to admin
- Backend: Supabase (Postgres + Realtime) for free hosting and realtime
- Hosting: Vercel for Next.js front-end
- AI: OpenAI/Anthropic via server-only key (RAG support later)

Immediate changes added:
- supabase/migrations/initial.sql (schema)
- supabase/migrations/seed.sql (seed data from provided lists)
- SUPABASE_SCHEMA.md (instructions)

Next steps to implement (will do after seeding):
1. Add Supabase client wrapper and environment-variable guidance
2. Create admin UI pages to browse/generate questions
3. Create candidate editor page with Monaco and realtime submissions
4. Add API route to trigger AI generation (server-only using service role key)
5. Wire CI / deploy to Vercel

