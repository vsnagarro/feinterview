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

      // Try several paths to extract text
      let text = ''
      // common GL shape: { candidates: [{ output: '...' }] }
      if (json.candidates && json.candidates.length) {
        text = json.candidates[0].output || json.candidates[0].content?.[0]?.text || ''
      }
      // older shape: { candidates: [{ content: [{ text: '...' }] }] }
      if (!text && json.candidates?.[0]?.content?.[0]?.text) {
        text = json.candidates[0].content[0].text
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
