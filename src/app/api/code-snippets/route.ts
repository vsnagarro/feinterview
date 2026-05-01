import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const url = new URL(req.url);
    const language = url.searchParams.get("language");
    const level = url.searchParams.get("level");
    const category = url.searchParams.get("category");

    let query = supabase.from("code_snippets").select("*");

    if (language) query = query.eq("language", language);
    if (level) query = query.eq("level", level);
    if (category) query = query.eq("category", category);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Error fetching code snippets:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const { title, code, language, level, category, explanation, tags, created_by_id } = body;

    if (!title || !code || !language || !created_by_id) {
      return NextResponse.json({ error: "Title, code, language, and created_by_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("code_snippets")
      .insert({
        title,
        code,
        language,
        level,
        category,
        explanation,
        tags: tags || [],
        created_by_id,
      })
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating code snippet:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
