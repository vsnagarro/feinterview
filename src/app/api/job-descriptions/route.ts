import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const url = new URL(req.url);
    const interviewerId = url.searchParams.get("interviewer_id");

    let query = supabase.from("job_descriptions").select("*");

    if (interviewerId) {
      query = query.eq("created_by_id", interviewerId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Error fetching job descriptions:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const { title, description, required_skills, tech_stack, experience_level, created_by_id } = body;

    if (!title || !description || !created_by_id) {
      return NextResponse.json({ error: "Title, description, and created_by_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("job_descriptions")
      .insert({
        title,
        description,
        required_skills: required_skills || [],
        tech_stack: tech_stack || [],
        experience_level,
        created_by_id,
      })
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating job description:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
