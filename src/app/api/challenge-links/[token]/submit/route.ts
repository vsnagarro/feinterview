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

    const { data: session } = await supabase.from("sessions").select("*").eq("challenge_token", token).single();

    if (session) {
      if (new Date(session.expires_at) < new Date()) {
        return NextResponse.json({ error: "Challenge has expired" }, { status: 410 });
      }

      const { data: submission, error: submitError } = await supabase
        .from("code_submissions")
        .insert({
          session_id: session.id,
          code,
          language,
        })
        .select();

      if (submitError) throw submitError;

      await supabase.from("sessions").update({ status: "submitted" }).eq("id", session.id);

      return NextResponse.json(
        {
          id: submission[0].id,
          message: "Code submitted successfully",
        },
        { status: 201 },
      );
    }

    const { data: challengeLink } = await supabase.from("challenge_links").select("*").eq("token", token).single();

    if (!challengeLink) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (new Date(challengeLink.expires_at) < new Date() || !challengeLink.is_active) {
      return NextResponse.json({ error: "Challenge has expired" }, { status: 410 });
    }

    const { data: submission, error: submitError } = await supabase
      .from("challenge_submissions")
      .insert({
        link_id: challengeLink.id,
        code,
        language,
        is_snapshot: false,
      })
      .select();

    if (submitError) throw submitError;

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
