import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

// Map years of experience to level
const mapExperienceLevel = (years: number): string => {
  if (years < 3) return 'junior'
  if (years < 7) return 'mid'
  return 'senior'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('sessions')
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
  const { candidateName, candidateEmail, skills, yearsExp, jdTitle, jdCompany, jdDescription, difficulty } = body

  // Create candidate
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .insert({
      name: candidateName,
      email: candidateEmail || null,
      experience_level: mapExperienceLevel(yearsExp || 0),
      skills: skills || [],
      summary: `${yearsExp} years of experience`,
      created_by_id: user.id,
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
        description: jdDescription,
        required_skills: skills || [],
        tech_stack: skills || [],
        experience_level: mapExperienceLevel(yearsExp || 0),
        created_by_id: user.id,
      })
      .select()
      .single()

    if (jdError) return NextResponse.json({ error: jdError.message }, { status: 500 })
    jdId = jd?.id
  }

  // Create session with challenge token
  const token = randomBytes(16).toString('hex')
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour default

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      challenge_token: token,
      candidate_id: candidate.id,
      job_description_id: jdId,
      interviewer_id: user.id,
      languages: ['javascript', 'typescript'],
      status: 'active',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

  return NextResponse.json(
    {
      success: true,
      challengeLink: `http://localhost:3000/challenge/${token}`,
      session,
      candidate,
      jobDescription: jdId,
    },
    { status: 201 }
  )
}
