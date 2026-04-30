import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIClient } from '@/lib/ai/client'
import { buildAnalyzePrompt } from '@/lib/claude/prompts'
import { extractJSON } from '@/lib/utils'
import type { AnalyzeCodePayload, CodeAnalysis } from '@/types/app'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: AnalyzeCodePayload = await request.json()
  const { systemPrompt, userMessage } = buildAnalyzePrompt({
    problemStatement: body.problemStatement,
    code: body.code,
    language: body.language,
  })

  const ai = getAIClient()

  try {
    const response = await ai.messages.create({
      model: process.env.GEMINI_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: systemPrompt,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cache_control: { type: 'ephemeral' } as any,
            },
            {
              type: 'text',
              text: userMessage,
            },
          ],
        },
      ],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    let analysis: CodeAnalysis

    try {
      analysis = JSON.parse(extractJSON(rawText))
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI analysis' }, { status: 500 })
    }

    // Save snapshot with analysis
    await supabase.from('challenge_submissions').insert({
      link_id: body.linkId,
      language: body.language,
      code: body.code,
      is_snapshot: true,
      ai_analysis: analysis as unknown as Record<string, unknown>,
    })

    return NextResponse.json(analysis)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
