import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const url = new URL(req.url);
    const level = url.searchParams.get("level");
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");

    let query = supabase.from("questions").select("*");

    if (level) query = query.eq("level", level);
    if (category) query = query.eq("category", category);
    if (search) query = query.ilike("text", `%${search}%`);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Error fetching questions:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const { text, answer, level, category, explanation, languages, question_type, created_by_id, simple_explanation, examples, code_examples } = body;

    if (!text || !answer || !created_by_id) {
      return NextResponse.json({ error: "Text, answer, and created_by_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        text,
        answer,
        level,
        category,
        explanation,
        simple_explanation,
        examples,
        code_examples,
        languages: languages || [],
        question_type,
        created_by_id,
      })
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating question:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const { id, answer, explanation, simple_explanation, examples, code_examples } = body;

    if (!id) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (answer !== undefined) updateData.answer = answer;
    if (explanation !== undefined) updateData.explanation = explanation;
    if (simple_explanation !== undefined) updateData.simple_explanation = simple_explanation;
    if (examples !== undefined) updateData.examples = examples;
    if (code_examples !== undefined) updateData.code_examples = code_examples;

    const { data, error } = await supabase.from("questions").update(updateData).eq("id", id).select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error: unknown) {
    console.error("Error updating question:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
