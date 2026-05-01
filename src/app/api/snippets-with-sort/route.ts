import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServiceClient();
    const url = new URL(request.url);

    const language = url.searchParams.get("language");
    const difficulty = url.searchParams.get("difficulty");
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const order = url.searchParams.get("order") === "desc" ? false : true;

    let query = supabase.from("code_snippets").select("*");

    if (language) query = query.eq("language", language);
    if (difficulty) query = query.eq("difficulty", difficulty);

    query = query.order(sortBy, { ascending: order });

    const { data, error } = await query;

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ snippets: data, count: data?.length || 0 });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
