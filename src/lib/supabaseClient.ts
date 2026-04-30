import { createClient } from '@supabase/supabase-js'

// Uses NEXT_PUBLIC_* so it can run in the browser. For server-only operations, use SERVICE_ROLE key on the server.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)
