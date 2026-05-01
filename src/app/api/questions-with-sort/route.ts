import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServiceClient();
    const url = new URL(request.url);

    const category = url.searchParams.get("category");
    const level = url.searchParams.get("level");
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const order = url.searchParams.get("order") === "desc" ? false : true;

    let query = supabase.from("questions").select("*");

    if (category) query = query.eq("category", category);
    if (level) query = query.eq("level", level);

    query = query.order(sortBy, { ascending: order });

    const { data, error } = await query;

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions: data, count: data?.length || 0 });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
