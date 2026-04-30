import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('interview_sessions')
    .select('*, candidates(name, email), job_descriptions(title, company)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { candidateName, candidateEmail, skills, yearsExp, candidateNotes, jdTitle, jdCompany, jdDescription, difficulty } = body

  // Upsert candidate
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .insert({
      name: candidateName,
      email: candidateEmail || null,
      skills: skills || [],
      years_exp: yearsExp || null,
      notes: candidateNotes || null,
    })
    .select()
    .single()

  if (candidateError) return NextResponse.json({ error: candidateError.message }, { status: 500 })

  // Create JD if provided
  let jdId: string | null = null
  if (jdDescription) {
    const { data: jd, error: jdError } = await supabase
      .from('job_descriptions')
      .insert({
        title: jdTitle || 'Untitled Role',
        company: jdCompany || null,
        description: jdDescription,
        skills: skills || [],
      })
      .select()
      .single()

    if (jdError) return NextResponse.json({ error: jdError.message }, { status: 500 })
    jdId = jd.id
  }

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from('interview_sessions')
    .insert({
      candidate_id: candidate.id,
      jd_id: jdId,
      difficulty,
      status: 'draft',
    })
    .select()
    .single()

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

  return NextResponse.json({ session, candidate, jdId }, { status: 201 })
}
