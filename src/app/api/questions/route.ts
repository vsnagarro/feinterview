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
    const { text, answer, level, category, explanation, languages, question_type, created_by_id } = body;

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
