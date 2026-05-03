-- Interview Profiles: reusable templates for interview sessions
CREATE TABLE IF NOT EXISTS interview_profiles (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  title              TEXT        NOT NULL,
  position           TEXT        NOT NULL DEFAULT '',
  level              TEXT        NOT NULL DEFAULT 'mid',
  jd_text            TEXT,
  question_count     INTEGER     NOT NULL DEFAULT 10,
  challenge_count    INTEGER     NOT NULL DEFAULT 3,
  trickiness         INTEGER     NOT NULL DEFAULT 3,
  difficulty         TEXT        NOT NULL DEFAULT 'mid',
  generate_type      TEXT        NOT NULL DEFAULT 'both',
  challenge_guideline TEXT,
  extra_checks       TEXT,
  notes              TEXT
);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION update_interview_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_interview_profiles_updated_at
  BEFORE UPDATE ON interview_profiles
  FOR EACH ROW EXECUTE FUNCTION update_interview_profiles_updated_at();

-- Link sessions to profiles (nullable — existing sessions have no profile)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES interview_profiles(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE interview_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_manage_profiles"
  ON interview_profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
