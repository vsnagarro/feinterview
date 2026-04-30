import { createGeminiAnthropicLike } from './geminiClient'
import { getAnthropicClient } from '@/lib/claude/client'

export function getAIClient() {
  if (process.env.GEMINI_API_KEY) {
    return createGeminiAnthropicLike(process.env.GEMINI_API_KEY)
  }
  return getAnthropicClient()
}
