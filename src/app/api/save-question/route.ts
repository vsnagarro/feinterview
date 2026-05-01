import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { text, category, level, answer, languages, explanation } = await request.json();

    if (!text || !category || !level || !answer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        text,
        category,
        level,
        answer,
        explanation,
        languages: languages || [],
        question_type: "short_answer",
      })
      .select()
      .single();

    if (error) {
      console.error("Question save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, question: data }, { status: 201 });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
