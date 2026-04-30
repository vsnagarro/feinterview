Supabase schema and seed help

This file describes the schema created in supabase/migrations/initial.sql and how to apply it.

1. Create a Supabase project (free tier) and open SQL Editor.
2. Enable extension for UUIDs: CREATE EXTENSION IF NOT EXISTS "pgcrypto";
3. Run supabase/migrations/initial.sql then supabase/migrations/seed.sql to create tables and seed questions/snippets.

Tables created:
- questions
- snippets
- jobs
- candidates
- challenges
- submissions
- ai_requests

Use environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server-only)

