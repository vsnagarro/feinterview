-- Add snippet_id to code_challenges to track which challenges have been saved to the library
ALTER TABLE code_challenges
  ADD COLUMN IF NOT EXISTS snippet_id uuid REFERENCES code_snippets(id) ON DELETE SET NULL;

-- Fix challenge_links token default: PostgreSQL encode() does not support 'base64url'
-- Token is now generated in the application layer; update the default to use base64 + trim padding
ALTER TABLE challenge_links
  ALTER COLUMN token SET DEFAULT replace(replace(rtrim(encode(gen_random_bytes(24), 'base64'), '='), '+', '-'), '/', '_');
