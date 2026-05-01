type AnthropicLikeResponse = { content: { type: string; text: string }[] }

type MessageContent = { type: string; text: string }
type Message = { role: string; content: MessageContent[] }

type MessagesCreateOpts = {
  model?: string
  max_tokens?: number
  messages: Message[]
}

export function createGeminiClient(apiKey?: string) {
  const KEY = apiKey || process.env.GEMINI_API_KEY
  const MODEL = process.env.GEMINI_MODEL || 'models/text-bison-001'

  return {
    async messagesCreate(opts: MessagesCreateOpts) {
      if (!KEY) throw new Error('GEMINI_API_KEY not set')
      const model = opts.model || MODEL
      const url = `https://generativelanguage.googleapis.com/v1/${model}:generate`

      // Build a prompt by concatenating message content texts
      const combined = opts.messages
        .map((m) => m.content.map((c) => c.text).join('\n'))
        .join('\n\n')

      const body: Record<string, unknown> = {
        // The API accepts a "prompt" or structured input depending on version; use simple prompt field
        prompt: combined,
        // Map tokens roughly
        maxOutputTokens: opts.max_tokens || 1024,
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Gemini API error: ${res.status} ${txt}`)
      }

      const json = await res.json() as Record<string, unknown>

      // Try several paths to extract text safely
      let text = ''

      const candidates = (json as { candidates?: unknown }).candidates
      if (Array.isArray(candidates) && candidates.length > 0) {
        const first = candidates[0] as Record<string, unknown>
        // attempt common fields in a type-safe way
        if (typeof first['output'] === 'string') {
          text = first['output'] as string
        } else if (Array.isArray(first['content'])) {
          const contentArr = first['content'] as unknown[]
          const maybe = contentArr[0] as Record<string, unknown> | undefined
          if (maybe && typeof maybe['text'] === 'string') {
            text = maybe['text'] as string
          }
        }
      }

      // fallback: try other nested shapes
      if (!text) {
        const maybeCandidates = (json as Record<string, unknown>)['candidates']
        if (Array.isArray(maybeCandidates) && maybeCandidates.length > 0) {
          const first = maybeCandidates[0] as Record<string, unknown>
          const content = first['content']
          if (Array.isArray(content) && content.length > 0) {
            const msg = content[0] as Record<string, unknown> | undefined
            if (msg && typeof msg['text'] === 'string') {
              text = msg['text'] as string
            }
          }
        }
      }

      // fallback: full stringification
      if (!text) text = JSON.stringify(json)

      const response: AnthropicLikeResponse = { content: [{ type: 'text', text }] }

      return { content: response.content }
    },
  }
}

// Adapter to mimic anthropic sdk interface
export function createGeminiAnthropicLike(apiKey?: string) {
  const client = createGeminiClient(apiKey)
  return {
    messages: {
      create: (opts: MessagesCreateOpts) => client.messagesCreate(opts),
    },
  }
}
