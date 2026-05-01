import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, code, language, explanation, tags, difficulty } = await request.json();

    if (!title || !code || !language) {
      return NextResponse.json({ error: "Missing required fields (title, code, language)" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("code_snippets")
      .insert({
        title,
        code,
        language,
        explanation: explanation || "",
        tags: tags || [],
        difficulty: difficulty || "mid",
      })
      .select()
      .single();

    if (error) {
      console.error("Snippet save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, snippet: data }, { status: 201 });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
