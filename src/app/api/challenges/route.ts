import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { sessionId, title, problemStatement, starterCode, supportedLanguages, timeLimitMinutes } = body

  const { data, error } = await supabase
    .from('code_challenges')
    .insert({
      session_id: sessionId,
      title,
      problem_statement: problemStatement,
      starter_code: starterCode || null,
      supported_languages: supportedLanguages ?? ['javascript', 'typescript'],
      time_limit_minutes: timeLimitMinutes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
