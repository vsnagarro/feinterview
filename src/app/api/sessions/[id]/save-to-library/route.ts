import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();

  // ── Questions ─────────────────────────────────────────────────────────────
  // Fetch session_questions that haven't been saved to the library yet
  const { data: unsavedQuestions, error: fetchQErr } = await supabase.from("session_questions").select("id, question, answer").eq("session_id", sessionId).is("question_id", null);

  if (fetchQErr) return NextResponse.json({ error: fetchQErr.message }, { status: 500 });

  let savedQuestions = 0;
  if (unsavedQuestions && unsavedQuestions.length > 0) {
    const { data: newQuestions, error: insertQErr } = await supabase
      .from("questions")
      .insert(
        unsavedQuestions.map((q) => ({
          text: q.question,
          answer: q.answer,
          question_type: "short_answer",
          languages: [] as string[],
        })),
      )
      .select("id");

    if (insertQErr) return NextResponse.json({ error: insertQErr.message }, { status: 500 });

    // Link session_questions back to the global questions
    for (let i = 0; i < unsavedQuestions.length; i++) {
      await supabase.from("session_questions").update({ question_id: newQuestions![i].id }).eq("id", unsavedQuestions[i].id);
    }
    savedQuestions = newQuestions?.length ?? 0;
  }

  // ── Code challenges ────────────────────────────────────────────────────────
  // Fetch code_challenges that haven't been saved to code_snippets yet
  const { data: unsavedChallenges, error: fetchCErr } = await supabase
    .from("code_challenges")
    .select("id, title, problem_statement, starter_code, supported_languages")
    .eq("session_id", sessionId)
    .is("snippet_id", null);

  if (fetchCErr) {
    // snippet_id column may not exist yet — skip without error
    return NextResponse.json({ savedQuestions, savedChallenges: 0 });
  }

  let savedChallenges = 0;
  if (unsavedChallenges && unsavedChallenges.length > 0) {
    const { data: newSnippets, error: insertSErr } = await supabase
      .from("code_snippets")
      .insert(
        unsavedChallenges.map((c) => ({
          title: c.title,
          description: c.problem_statement,
          code: c.starter_code ?? "",
          language: c.supported_languages?.[0] ?? "javascript",
          tags: [] as string[],
          difficulty: "mid" as const,
          source: "ai_generated" as const,
        })),
      )
      .select("id");

    if (insertSErr) return NextResponse.json({ error: insertSErr.message }, { status: 500 });

    // Link code_challenges back to code_snippets
    for (let i = 0; i < unsavedChallenges.length; i++) {
      await supabase.from("code_challenges").update({ snippet_id: newSnippets![i].id }).eq("id", unsavedChallenges[i].id);
    }
    savedChallenges = newSnippets?.length ?? 0;
  }

  return NextResponse.json({ savedQuestions, savedChallenges });
}
