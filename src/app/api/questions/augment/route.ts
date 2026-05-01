import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createGeminiAnthropicLike } from "@/lib/ai/geminiClient";

interface QuestionWithAugmentation {
  id: string;
  text: string;
  answer: string;
  explanation?: string | null;
  simple_explanation?: string | null;
  examples?: string[] | null;
  code_examples?: Array<{ language: string; code: string }> | null;
}

async function augmentQuestionAnswer(question: QuestionWithAugmentation): Promise<{
  simple_explanation: string;
  examples: string[];
  code_examples: Array<{ language: string; code: string }>;
}> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const gemini = createGeminiAnthropicLike();

  const prompt = `You are an expert technical educator. Given a technical question and its answer, create:
1. A simple, beginner-friendly explanation (1-2 sentences)
2. 2-3 analogous real-world examples
3. 2 code examples in different languages (JavaScript and Python)

Question: ${question.text}
Current Answer: ${question.answer}
${question.explanation ? `Current Explanation: ${question.explanation}` : ""}

Respond in JSON format with these exact keys:
{
  "simple_explanation": "...",
  "examples": ["example1", "example2", "example3"],
  "code_examples": [
    {"language": "javascript", "code": "..."},
    {"language": "python", "code": "..."}
  ]
}

Important:
- Keep simple_explanation concise and in plain English
- Make examples relatable and concrete
- Ensure code examples are syntactically correct and runnable
- Code examples should demonstrate the answer/concept clearly`;

  const message = await gemini.messages.create({
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Gemini");
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = content.text;
  const jsonMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/) || jsonStr.match(/```\n([\s\S]*?)\n```/) || jsonStr.match(/({[\s\S]*})/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    console.error("Failed to parse Gemini response:", jsonStr);
    throw new Error("Failed to parse Gemini response as JSON");
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured. Please ensure your .env.local file contains GEMINI_API_KEY and GEMINI_MODEL",
        },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { questionIds } = body;

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json({ error: "questionIds array required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Fetch the questions
    const { data: questions, error: fetchError } = await supabase.from("questions").select("*").in("id", questionIds);

    if (fetchError) throw fetchError;

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "No questions found" }, { status: 404 });
    }

    // Augment each question
    const results = [];
    for (const question of questions) {
      try {
        const augmented = await augmentQuestionAnswer(question);

        // Update the question in the database
        const { data: updated, error: updateError } = await supabase
          .from("questions")
          .update({
            simple_explanation: augmented.simple_explanation,
            examples: augmented.examples,
            code_examples: augmented.code_examples,
          })
          .eq("id", question.id)
          .select();

        if (updateError) throw updateError;

        results.push({
          id: question.id,
          success: true,
          question: question.text.substring(0, 50) + "...",
          data: updated?.[0],
        });
      } catch (e) {
        results.push({
          id: question.id,
          success: false,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      total: questions.length,
      augmented: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error: unknown) {
    console.error("Error augmenting questions:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
