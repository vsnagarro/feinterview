import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // Use service role — anon users have no RLS access to challenge_links
  const supabase = await createServiceClient()

  const { data: link, error } = await supabase
    .from('challenge_links')
    .select('*, code_challenges(*)')
    .eq('token', token)
    .single()

  if (error || !link) {
    return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 404 })
  }

  if (!link.is_active) {
    return NextResponse.json({ valid: false, reason: 'inactive' })
  }

  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  // Mark as opened on first access
  if (!link.opened_at) {
    await supabase
      .from('challenge_links')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', link.id)
  }

  const challenge = Array.isArray(link.code_challenges) ? link.code_challenges[0] : link.code_challenges

  return NextResponse.json({
    valid: true,
    linkId: link.id,
    challengeId: (challenge as { id: string }).id,
    title: (challenge as { title: string }).title,
    problemStatement: (challenge as { problem_statement: string }).problem_statement,
    starterCode: (challenge as { starter_code: string | null }).starter_code,
    supportedLanguages: (challenge as { supported_languages: string[] }).supported_languages,
    timeLimitMinutes: (challenge as { time_limit_minutes: number | null }).time_limit_minutes,
    expiresAt: link.expires_at,
    candidateName: link.candidate_name,
  })
}
