import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("interview_profiles").select("*").order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    title,
    position = "",
    level = "mid",
    jd_text,
    question_count = 10,
    challenge_count = 3,
    trickiness = 3,
    difficulty = "mid",
    generate_type = "both",
    challenge_guideline,
    extra_checks,
    notes,
    experience_range,
  } = body;

  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("interview_profiles")
    .insert({
      title: title.trim(),
      position: position.trim(),
      level,
      jd_text: jd_text || null,
      question_count: Number(question_count),
      challenge_count: Number(challenge_count),
      trickiness: Number(trickiness),
      difficulty,
      generate_type,
      challenge_guideline: challenge_guideline || null,
      extra_checks: extra_checks || null,
      notes: notes || null,
      experience_range: experience_range || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
