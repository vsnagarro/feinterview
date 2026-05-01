import { GoogleGenerativeAI } from "@google/generative-ai";

type AnthropicLikeResponse = { content: { type: string; text: string }[] };

type MessageContent = { type: string; text: string };
type Message = { role: string; content: MessageContent[] };

type MessagesCreateOpts = {
  model?: string;
  max_tokens?: number;
  messages: Message[];
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createGeminiClient(apiKey?: string) {
  const KEY = apiKey || process.env.GEMINI_API_KEY;
  const MODEL = (process.env.GEMINI_MODEL || "models/gemini-2.5-flash-lite").replace(/^models\//, "");

  return {
    async messagesCreate(opts: MessagesCreateOpts) {
      if (!KEY) throw new Error("GEMINI_API_KEY not set");
      const model = (opts.model || MODEL).replace(/^models\//, "");
      const client = new GoogleGenerativeAI(KEY);
      const generativeModel = client.getGenerativeModel({ model });

      const combined = opts.messages.map((m) => m.content.map((c) => c.text).join("\n")).join("\n\n");

      const maxAttempts = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const result = await generativeModel.generateContent({
            contents: [
              {
                role: "user",
                parts: [{ text: combined }],
              },
            ],
            generationConfig: {
              maxOutputTokens: opts.max_tokens || 4096,
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          });

          const text = result.response.text();

          if (!text) {
            throw new Error("Gemini API returned an empty response");
          }

          const response: AnthropicLikeResponse = { content: [{ type: "text", text }] };
          return { content: response.content };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const is429 = lastError.message.includes("429") || lastError.message.includes("Too Many Requests");
          if (is429 && attempt < maxAttempts - 1) {
            // Extract retryDelay from error message or use exponential backoff
            const retryMatch = lastError.message.match(/retryDelay":"(\d+)s"/);
            const delaySec = retryMatch ? parseInt(retryMatch[1], 10) : 15 * (attempt + 1);
            await sleep(delaySec * 1000);
            continue;
          }
          throw lastError;
        }
      }

      throw lastError ?? new Error("Gemini: max retries exceeded");
    },
  };
}

// Adapter to mimic anthropic sdk interface
export function createGeminiAnthropicLike(apiKey?: string) {
  const client = createGeminiClient(apiKey);
  return {
    messages: {
      create: (opts: MessagesCreateOpts) => client.messagesCreate(opts),
    },
  };
}
