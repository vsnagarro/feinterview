import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.from("candidates").select("*").order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const { name, email, experience_level, skills, summary, created_by_id } = body;

    if (!name || !created_by_id) {
      return NextResponse.json({ error: "Name and created_by_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("candidates")
      .insert({
        name,
        email,
        experience_level,
        skills: skills || [],
        summary,
        created_by_id,
      })
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating candidate:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
