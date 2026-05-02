import { NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";

function isUUID(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createServiceClient();

  // First, check if token matches a session.challenge_token (public session links)
  const { data: session } = await supabase
    .from("sessions")
    .select("*, candidates(id, name, email, experience_level), job_descriptions(id, title, description, required_skills, tech_stack)")
    .eq("challenge_token", token)
    .single();

  if (session) {
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" }, { status: 410 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.job_descriptions?.title ?? "Coding Challenge",
        problemStatement: session.job_descriptions?.description ?? "",
        languages: session.languages ?? ["javascript"],
        timeLimitMinutes: null,
      },
      candidate: session.candidates,
      jobDescription: session.job_descriptions,
      linkType: "session",
    });
  }

  // Otherwise treat as a challenge_link token
  const { data: link, error } = await supabase.from("challenge_links").select("*").eq("token", token).single();

  if (error || !link) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
  }

  if (!link.is_active) {
    return NextResponse.json({ valid: false, reason: "inactive" });
  }

  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  if (!link.opened_at) {
    await supabase.from("challenge_links").update({ opened_at: new Date().toISOString() }).eq("id", link.id);
  }

  const { data: challenge } = await supabase.from("code_challenges").select("*").eq("id", link.challenge_id).single();
  const { data: liveCodeState } = await supabase.from("live_code_state").select("code, language, updated_at").eq("link_id", link.id).single();

  const linkedSession = challenge?.session_id
    ? await supabase
        .from("sessions")
        .select("*, candidates(id, name, email, experience_level), job_descriptions(id, title, description, required_skills, tech_stack)")
        .eq("id", challenge.session_id)
        .single()
    : { data: null };

  const sessionData = linkedSession.data;

  // Hide admin-only solution fields from candidate view
  const publicChallenge = challenge
    ? {
        id: challenge.id,
        title: challenge.title,
        problem_statement: challenge.problem_statement,
        use_case: challenge.use_case,
        requirements: challenge.requirements ?? [],
        workspace_template: challenge.workspace_template ?? "vanilla",
        sandbox_dependencies: challenge.sandbox_dependencies ?? {},
        starter_code: challenge.starter_code,
        supported_languages: challenge.supported_languages ?? ["javascript"],
        time_limit_minutes: challenge.time_limit_minutes,
      }
    : null;

  return NextResponse.json({
    session: {
      id: sessionData?.id,
      title: publicChallenge?.title,
      problemStatement: publicChallenge?.problem_statement,
      useCase: publicChallenge?.use_case,
      requirements: publicChallenge?.requirements ?? [],
      workspaceTemplate: publicChallenge?.workspace_template ?? "vanilla",
      sandboxDependencies: publicChallenge?.sandbox_dependencies ?? {},
      starterCode: publicChallenge?.starter_code,
      languages: publicChallenge?.supported_languages ?? ["javascript"],
      timeLimitMinutes: publicChallenge?.time_limit_minutes,
    },
    candidate: sessionData?.candidates ?? { id: "", name: link.candidate_name ?? "Candidate" },
    jobDescription: sessionData?.job_descriptions ?? {
      id: challenge?.id,
      title: challenge?.title,
      description: challenge?.problem_statement,
      required_skills: [],
      tech_stack: [],
    },
    linkId: link.id,
    challengeId: challenge?.id,
    expiresAt: link.expires_at,
    candidateName: link.candidate_name,
    liveCodeState,
    linkType: "challenge_link",
  });
}

// Admin actions: expire/reactivate/update expiresAt or soft-delete (deactivate) a link.
export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { action } = body as { action?: string };
  const whereField = isUUID(token) ? "id" : "token";

  try {
    if (action === "expire") {
      const { data, error } = await supabase.from("challenge_links").update({ is_active: false, expires_at: new Date().toISOString() }).eq(whereField, token).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (action === "reactivate") {
      const { data, error } = await supabase.from("challenge_links").update({ is_active: true }).eq(whereField, token).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (action === "updateExpiresAt") {
      const { expiresAt } = body as { expiresAt?: string };
      if (!expiresAt) return NextResponse.json({ error: "expiresAt required" }, { status: 400 });
      const { data, error } = await supabase.from("challenge_links").update({ expires_at: expiresAt }).eq(whereField, token).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const whereField = isUUID(token) ? "id" : "token";

  try {
    // HARD DELETE the link row (per request)
    const { data, error } = await supabase.from("challenge_links").delete().eq(whereField, token).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, link: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
