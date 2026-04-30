import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIClient } from '@/lib/ai/client'
import { buildGeneratePrompt } from '@/lib/claude/prompts'
import { extractJSON } from '@/lib/utils'
import type { GenerateQuestionsPayload, GeneratedQuestion, GeneratedSnippet } from '@/types/app'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: GenerateQuestionsPayload = await request.json()
  const { systemPrompt, userMessage } = buildGeneratePrompt(body)

  const ai = getAIClient()

  // Use streaming to avoid Vercel 10s timeout on hobby plan
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()

      try {
        const response = await ai.messages.create({
          model: process.env.GEMINI_MODEL || 'claude-sonnet-4-6',
          max_tokens: 8192,
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

        let parsed: { questions: GeneratedQuestion[]; snippets: GeneratedSnippet[] }
        try {
          parsed = JSON.parse(extractJSON(rawText))
        } catch {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: 'Failed to parse AI response' })}\n\n`))
          controller.close()
          return
        }

        // Insert questions into library
        const questionInserts = parsed.questions.map((q) => ({
          question: q.question,
          answer: q.answer,
          tags: q.tags ?? [],
          difficulty: q.difficulty ?? body.difficulty,
          topic: q.topic ?? null,
          source: 'ai_generated' as const,
        }))

        const { data: insertedQuestions } = await supabase
          .from('questions')
          .insert(questionInserts)
          .select()

        // Insert session_questions
        if (insertedQuestions) {
          await supabase.from('session_questions').insert(
            insertedQuestions.map((q, i) => ({
              session_id: body.sessionId,
              question_id: q.id,
              question: q.question,
              answer: q.answer,
              order_index: i,
            }))
          )
        }

        // Insert code snippets into library
        const snippetInserts = parsed.snippets.map((s) => ({
          title: s.title,
          description: s.description ?? null,
          language: s.language ?? 'javascript',
          code: s.code,
          explanation: s.explanation ?? null,
          tags: s.tags ?? [],
          difficulty: s.difficulty ?? body.difficulty,
          source: 'ai_generated' as const,
        }))

        const { data: insertedSnippets } = await supabase
          .from('code_snippets')
          .insert(snippetInserts)
          .select()

        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({
              questions: insertedQuestions ?? [],
              snippets: insertedSnippets ?? [],
            })}\n\n`
          )
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
