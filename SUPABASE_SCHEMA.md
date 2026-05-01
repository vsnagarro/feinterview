Supabase schema and seed help

This project now has one canonical schema path.

Apply schema in this order:

1. Run supabase/migrations/0001_initial_schema.sql
2. Run supabase/migrations/0002_schema_unification.sql
3. Run supabase/migrations/seed.sql or call the app seed endpoint

Do not apply supabase/migrations/initial.sql directly. It is now only a deprecated stub that prevents accidental reuse of the older incompatible schema.

Canonical tables:

- interviewers
- candidates
- job_descriptions
- sessions
- code_submissions
- questions
- code_snippets
- session_questions
- code_challenges
- challenge_links
- challenge_submissions
- live_code_state

Environment variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
