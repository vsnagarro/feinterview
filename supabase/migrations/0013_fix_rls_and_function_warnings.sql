-- Fix Supabase linter warnings (0013)
-- 1. function_search_path_mutable: set search_path on trigger function
-- 2. Duplicate RLS policies on sessions and code_submissions
-- 3. Missing policy on interviewers table
-- 4. Tighten anon policies on challenge_submissions and live_code_state
-- 5. Ensure code_challenges has solution/admin_only columns (migration 0008 was not applied)
-- NOTE: Authenticated USING(true) policies are intentional — this is an
--       admin-only app where every authenticated user IS an admin.

-- ============================================================
-- 0. Ensure code_challenges columns exist (fixes schema cache error)
-- ============================================================
ALTER TABLE code_challenges
  ADD COLUMN IF NOT EXISTS solution TEXT,
  ADD COLUMN IF NOT EXISTS solution_explanation TEXT,
  ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT true;

-- ============================================================
-- 1. Fix mutable search_path on update_interview_profiles_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_interview_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Remove duplicate policies
-- sessions: keep "admin_all_sessions", drop old "admin_all"
-- code_submissions: keep "admin_all_code_submissions", drop old "admin_all"
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='admin_all') THEN
    DROP POLICY "admin_all" ON public.sessions;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='code_submissions' AND policyname='admin_all') THEN
    DROP POLICY "admin_all" ON public.code_submissions;
  END IF;
END $$;

-- ============================================================
-- 3. Add policy for interviewers table (RLS enabled but no policy)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='interviewers' AND policyname='admin_all_interviewers') THEN
    CREATE POLICY "admin_all_interviewers" ON public.interviewers
      AS PERMISSIVE FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 4. Tighten anon INSERT on challenge_submissions
--    Only allow insert when link_id references an active, non-expired link
-- ============================================================
DROP POLICY IF EXISTS "public_insert_submissions" ON public.challenge_submissions;

CREATE POLICY "public_insert_submissions" ON public.challenge_submissions
  AS PERMISSIVE FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenge_links cl
      WHERE cl.id = link_id
        AND cl.is_active = true
        AND cl.expires_at > now()
    )
  );

-- ============================================================
-- 5. Tighten anon ALL on live_code_state
--    Only allow access when link_id references an active, non-expired link
-- ============================================================
DROP POLICY IF EXISTS "public_write_live_code" ON public.live_code_state;

CREATE POLICY "public_read_live_code" ON public.live_code_state
  AS PERMISSIVE FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_links cl
      WHERE cl.id = link_id
        AND cl.is_active = true
    )
  );

CREATE POLICY "public_write_live_code" ON public.live_code_state
  AS PERMISSIVE FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenge_links cl
      WHERE cl.id = link_id
        AND cl.is_active = true
        AND cl.expires_at > now()
    )
  );

CREATE POLICY "public_update_live_code" ON public.live_code_state
  AS PERMISSIVE FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_links cl
      WHERE cl.id = link_id
        AND cl.is_active = true
        AND cl.expires_at > now()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenge_links cl
      WHERE cl.id = link_id
        AND cl.is_active = true
        AND cl.expires_at > now()
    )
  );
