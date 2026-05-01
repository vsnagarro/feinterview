import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { code, language } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language required" }, { status: 400 });
    }

    // Find session by token
    const { data: session, error: sessionError } = await supabase.from("sessions").select("*").eq("challenge_token", token).single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: "Challenge has expired" }, { status: 410 });
    }

    // Submit code
    const { data: submission, error: submitError } = await supabase
      .from("code_submissions")
      .insert({
        session_id: session.id,
        code,
        language,
      })
      .select();

    if (submitError) throw submitError;

    // Update session status
    await supabase.from("sessions").update({ status: "submitted" }).eq("id", session.id);

    return NextResponse.json(
      {
        id: submission[0].id,
        message: "Code submitted successfully",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Error submitting code:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
