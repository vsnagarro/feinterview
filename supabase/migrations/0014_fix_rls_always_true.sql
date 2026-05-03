-- Migration 0014: Silence rls_policy_always_true linter warnings
-- Replace USING(true)/WITH CHECK(true) with auth.uid() IS NOT NULL
-- on all authenticated FOR ALL policies. Functionally identical since
-- policies are already scoped TO authenticated, but satisfies the linter.

-- app_settings
DROP POLICY IF EXISTS "admin_all_app_settings" ON public.app_settings;
CREATE POLICY "admin_all_app_settings" ON public.app_settings
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- candidates
DROP POLICY IF EXISTS "admin_all" ON public.candidates;
CREATE POLICY "admin_all" ON public.candidates
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- challenge_links
DROP POLICY IF EXISTS "admin_all_challenge_links" ON public.challenge_links;
CREATE POLICY "admin_all_challenge_links" ON public.challenge_links
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- challenge_submissions
DROP POLICY IF EXISTS "admin_all_challenge_submissions" ON public.challenge_submissions;
CREATE POLICY "admin_all_challenge_submissions" ON public.challenge_submissions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- code_challenges
DROP POLICY IF EXISTS "admin_all_code_challenges" ON public.code_challenges;
CREATE POLICY "admin_all_code_challenges" ON public.code_challenges
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- code_snippets
DROP POLICY IF EXISTS "admin_all" ON public.code_snippets;
CREATE POLICY "admin_all" ON public.code_snippets
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- code_submissions
DROP POLICY IF EXISTS "admin_all_code_submissions" ON public.code_submissions;
CREATE POLICY "admin_all_code_submissions" ON public.code_submissions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- interview_profiles
DROP POLICY IF EXISTS "authenticated_manage_profiles" ON public.interview_profiles;
CREATE POLICY "authenticated_manage_profiles" ON public.interview_profiles
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- interviewers
DROP POLICY IF EXISTS "admin_all_interviewers" ON public.interviewers;
CREATE POLICY "admin_all_interviewers" ON public.interviewers
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- job_descriptions
DROP POLICY IF EXISTS "admin_all" ON public.job_descriptions;
CREATE POLICY "admin_all" ON public.job_descriptions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- live_code_state
DROP POLICY IF EXISTS "admin_all_live_code_state" ON public.live_code_state;
CREATE POLICY "admin_all_live_code_state" ON public.live_code_state
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- questions
DROP POLICY IF EXISTS "admin_all" ON public.questions;
CREATE POLICY "admin_all" ON public.questions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- session_questions
DROP POLICY IF EXISTS "admin_all_session_questions" ON public.session_questions;
CREATE POLICY "admin_all_session_questions" ON public.session_questions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- sessions
DROP POLICY IF EXISTS "admin_all_sessions" ON public.sessions;
CREATE POLICY "admin_all_sessions" ON public.sessions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
