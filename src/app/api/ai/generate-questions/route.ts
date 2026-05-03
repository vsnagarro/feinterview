import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAIClient } from "@/lib/ai/client";
import { buildGeneratePrompt } from "@/lib/claude/prompts";
import { extractJSON } from "@/lib/utils";
import type { GenerateQuestionsPayload, GeneratedQuestion, GeneratedSnippet } from "@/types/app";

function normalizeDifficulty(value: string | undefined, fallback: GenerateQuestionsPayload["difficulty"]) {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "junior" || normalized === "easy") return "junior";
  if (normalized === "mid" || normalized === "medium" || normalized === "mid-level" || normalized === "intermediate") return "mid";
  if (normalized === "senior" || normalized === "hard" || normalized === "advanced") return "senior";

  return fallback;
}

function repairJSONString(rawText: string) {
  let repaired = "";
  let inString = false;
  let isEscaped = false;

  for (const char of rawText) {
    if (char === '"' && !isEscaped) {
      inString = !inString;
      repaired += char;
      continue;
    }

    if (inString) {
      if (char === "\n") {
        repaired += "\\n";
        isEscaped = false;
        continue;
      }
      if (char === "\r") {
        repaired += "\\r";
        isEscaped = false;
        continue;
      }
      if (char === "\t") {
        repaired += "\\t";
        isEscaped = false;
        continue;
      }
    }

    repaired += char;
    isEscaped = char === "\\" && !isEscaped;
    if (char !== "\\") {
      isEscaped = false;
    }
  }

  return repaired;
}

export async function POST(request: Request) {
  // Auth check with anon client (reads session cookie)
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Service client for all DB writes (bypasses RLS, no JWT needed for inserts)
  const supabase = await createServiceClient();

  const body: GenerateQuestionsPayload & { generateType?: "questions" | "challenges" | "both"; challengeGuideline?: string } = await request.json();

  const ai = getAIClient();
  // Read model from app_settings (admin-persisted selection), fall back to env
  const defaultModel = process.env.GEMINI_API_KEY ? process.env.GEMINI_MODEL || "models/gemini-2.5-flash" : process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const modelSettingRes = await supabase.from("app_settings").select("value").eq("key", "ai_model").maybeSingle();
  const model = (modelSettingRes.data as { value?: string } | null)?.value ?? defaultModel;

  // Use streaming to avoid Vercel 10s timeout on hobby plan
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      try {
        // Respect generateType override
        const genType = body.generateType ?? "both";
        const requestedQuestionCount = genType === "challenges" ? 0 : Math.max(1, body.count ?? 10);
        const requestedChallengeCount = genType === "questions" ? 0 : Math.max(0, body.challengeCount ?? 10);
        const questionBatchSize = 3;
        const challengeBatchSize = 1;
        const batchCount = Math.max(Math.ceil(requestedQuestionCount / questionBatchSize), requestedChallengeCount > 0 ? Math.ceil(requestedChallengeCount / challengeBatchSize) : 1);

        const aggregatedQuestions: GeneratedQuestion[] = [];
        const aggregatedSnippets: GeneratedSnippet[] = [];

        for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
          const remainingQuestions = Math.max(requestedQuestionCount - aggregatedQuestions.length, 0);
          const remainingChallenges = Math.max(requestedChallengeCount - aggregatedSnippets.length, 0);
          const batchQuestionCount = Math.min(questionBatchSize, remainingQuestions);
          const batchChallengeCount = Math.min(challengeBatchSize, remainingChallenges);

          if (batchQuestionCount === 0 && batchChallengeCount === 0) {
            break;
          }

          const batchPrompt = buildGeneratePrompt({
            ...body,
            count: batchQuestionCount,
            challengeCount: batchChallengeCount,
          });

          const response = await ai.messages.create({
            model,
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: batchPrompt.systemPrompt,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    cache_control: { type: "ephemeral" } as any,
                  },
                  {
                    type: "text",
                    text: batchPrompt.userMessage,
                  },
                ],
              },
            ],
          });

          const rawText = response.content[0].type === "text" ? response.content[0].text : "";

          let parsed: { questions: GeneratedQuestion[]; snippets: GeneratedSnippet[] };
          try {
            parsed = JSON.parse(repairJSONString(extractJSON(rawText)));
          } catch {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: `Failed to parse AI response in batch ${batchIndex + 1}` })}\n\n`));
            controller.close();
            return;
          }

          aggregatedQuestions.push(...(parsed.questions ?? []));
          aggregatedSnippets.push(...(parsed.snippets ?? []));

          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({
                status: "progress",
                completedBatches: batchIndex + 1,
                totalBatches: batchCount,
                generatedQuestions: aggregatedQuestions.length,
                generatedChallenges: aggregatedSnippets.length,
              })}\n\n`,
            ),
          );
        }

        const parsed = {
          questions: aggregatedQuestions.slice(0, requestedQuestionCount),
          snippets: aggregatedSnippets.slice(0, requestedChallengeCount),
        };

        if (parsed.questions.length === 0) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: "AI generation returned no questions" })}\n\n`));
          controller.close();
          return;
        }

        // Insert directly into session_questions (no auto-push to global library)
        const sessionQuestionInserts = parsed.questions.map((q, i) => ({
          session_id: body.sessionId,
          question_id: null as string | null,
          question: q.question,
          answer: q.answer,
          explanation: q.explanation ?? q.topicExplanation ?? null,
          metadata: {
            explanation: q.explanation ?? q.topicExplanation ?? null,
            simpleExplanation: q.simpleExplanation ?? q.analogy ?? null,
            highlights: q.highlights ?? null,
            codeExamples: q.codeExamples ?? null,
          },
          order_index: i,
        }));

        const { data: insertedSessionQuestions, error: sessionQuestionsError } = await supabase.from("session_questions").insert(sessionQuestionInserts).select();

        if (sessionQuestionsError) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: sessionQuestionsError.message })}\n\n`));
          controller.close();
          return;
        }

        if (!insertedSessionQuestions || insertedSessionQuestions.length === 0) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: "Question generation produced no saved questions" })}\n\n`));
          controller.close();
          return;
        }

        // Insert code challenges directly (no auto-push to code_snippets library)
        const challengeInserts = parsed.snippets.map((snippet, index) => {
          const difficulty = normalizeDifficulty(snippet.difficulty, body.difficulty);
          return {
            session_id: body.sessionId,
            title: `[${difficulty.toUpperCase()}] ${snippet.title?.trim() || `Generated challenge ${index + 1}`}`,
            problem_statement: [snippet.description, snippet.explanation].filter(Boolean).join("\n\n") || "Complete the coding task using the starter code.",
            use_case: body.challengeGuideline ?? null,
            starter_code: snippet.code ?? "",
            supported_languages: [snippet.language ?? "javascript"],
            time_limit_minutes: difficulty === "senior" ? 60 : difficulty === "mid" ? 45 : 30,
            solution: snippet.solution ?? null,
            solution_explanation: snippet.solutionExplanation ?? null,
            admin_only: true,
          };
        });

        const { data: insertedChallenges, error: challengeError } = await supabase.from("code_challenges").insert(challengeInserts).select();

        if (challengeError) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: challengeError.message })}\n\n`));
          controller.close();
          return;
        }

        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({
              questions: insertedSessionQuestions ?? [],
              snippets: parsed.snippets ?? [],
              challenges: insertedChallenges ?? [],
            })}\n\n`,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
