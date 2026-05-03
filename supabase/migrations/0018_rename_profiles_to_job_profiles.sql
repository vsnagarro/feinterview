-- Rename interview_profiles → job_profiles for naming consistency
ALTER TABLE interview_profiles RENAME TO job_profiles;

-- Create candidate_job_profiles join table (many-to-many)
CREATE TABLE IF NOT EXISTS candidate_job_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_profile_id UUID NOT NULL REFERENCES job_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT candidate_job_profiles_unique UNIQUE(candidate_id, job_profile_id)
);

ALTER TABLE candidate_job_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_candidate_job_profiles
  ON candidate_job_profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
