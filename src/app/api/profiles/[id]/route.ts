import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("job_profiles").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { title, position, level, jd_text, question_count, challenge_count, trickiness, difficulty, generate_type, challenge_guideline, extra_checks, notes, experience_range } = body;

  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title.trim();
  if (position !== undefined) update.position = position.trim();
  if (level !== undefined) update.level = level;
  if (jd_text !== undefined) update.jd_text = jd_text || null;
  if (question_count !== undefined) update.question_count = Number(question_count);
  if (challenge_count !== undefined) update.challenge_count = Number(challenge_count);
  if (trickiness !== undefined) update.trickiness = Number(trickiness);
  if (difficulty !== undefined) update.difficulty = difficulty;
  if (generate_type !== undefined) update.generate_type = generate_type;
  if (challenge_guideline !== undefined) update.challenge_guideline = challenge_guideline || null;
  if (extra_checks !== undefined) update.extra_checks = extra_checks || null;
  if (notes !== undefined) update.notes = notes || null;
  if (experience_range !== undefined) update.experience_range = experience_range || null;

  const { data, error } = await supabase.from("job_profiles").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("job_profiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
