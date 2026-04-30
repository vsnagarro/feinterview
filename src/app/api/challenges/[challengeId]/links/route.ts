import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('challenge_links')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { expiresAt, candidateName } = body

  const { data, error } = await supabase
    .from('challenge_links')
    .insert({
      challenge_id: challengeId,
      expires_at: expiresAt,
      is_active: true,
      candidate_name: candidateName || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json({ ...data, url: `${appUrl}/challenge/${data.token}` }, { status: 201 })
}
