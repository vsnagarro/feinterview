-- Add solution fields to code_challenges
ALTER TABLE code_challenges
  ADD COLUMN IF NOT EXISTS solution text,
  ADD COLUMN IF NOT EXISTS solution_explanation text,
  ADD COLUMN IF NOT EXISTS admin_only boolean DEFAULT true;

-- Optional: grant service role or adjust policies if needed (run in Supabase SQL editor)
-- Example policy to allow service role to insert into storage objects (if applicable):
-- ALTER POLICY "Allow service role" ON storage.objects USING (auth.role() = 'service_role');
