-- Add interviewer feedback and screenshot to sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- App settings table for persistent admin preferences (e.g. AI model selection)
CREATE TABLE IF NOT EXISTS app_settings (
  key  TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_app_settings" ON app_settings
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
