import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// Map years of experience to level
const mapExperienceLevel = (years: number): string => {
  if (years < 3) return "junior";
  if (years < 7) return "mid";
  return "senior";
};

export async function GET() {
  const supabase = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("sessions").select("*, candidates(name, email), job_descriptions(title, company)").order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { candidateName, candidateEmail, skills, yearsExp, jdTitle, jdCompany, jdDescription, difficulty } = body;

  // Ensure interviewer record exists
  let interviewerId = user.id;
  const { data: existingInterviewer } = await supabase.from("interviewers").select("id").eq("id", user.id).single();

  if (!existingInterviewer) {
    const { data: interviewer, error: iError } = await supabase
      .from("interviewers")
      .insert({
        id: user.id,
        email: user.email || "unknown@example.com",
        name: user.user_metadata?.full_name || "Interviewer",
        password_hash: "oauth", // oauth users don't need password hash
      })
      .select()
      .single();

    if (iError) console.error("Interviewer creation error:", iError);
  }

  // Create candidate - use actual schema columns
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .insert({
      name: candidateName,
      email: candidateEmail || null,
      skills: skills || [],
      years_exp: yearsExp || 0,
    })
    .select()
    .single();

  if (candidateError) {
    console.error("Candidate creation error:", candidateError);
    return NextResponse.json({ error: candidateError.message }, { status: 500 });
  }

  // Create JD if provided - use actual schema columns
  let jdId: string | null = null;
  if (jdDescription) {
    const { data: jd, error: jdError } = await supabase
      .from("job_descriptions")
      .insert({
        title: jdTitle || "Untitled Role",
        company: jdCompany || null,
        description: jdDescription,
        skills: skills || [],
      })
      .select()
      .single();

    if (jdError) {
      console.error("JD creation error:", jdError);
      return NextResponse.json({ error: jdError.message }, { status: 500 });
    }
    jdId = jd?.id;
  } else {
    // Create default JD if not provided
    const { data: jd, error: jdError } = await supabase
      .from("job_descriptions")
      .insert({
        title: jdTitle || "Frontend Interview",
        company: jdCompany || "Company",
        description: jdDescription || "Frontend Engineering Role",
        skills: skills || [],
      })
      .select()
      .single();

    if (jdError) {
      console.error("Default JD creation error:", jdError);
      return NextResponse.json({ error: jdError.message }, { status: 500 });
    }
    jdId = jd?.id;
  }

  // Create session with challenge token
  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour default

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      challenge_token: token,
      candidate_id: candidate.id,
      job_description_id: jdId,
      interviewer_id: interviewerId,
      languages: ["javascript", "typescript"],
      status: "active",
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (sessionError) {
    console.error("Session creation error:", sessionError);
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      challengeLink: `http://localhost:3000/challenge/${token}`,
      session,
      candidate,
      jobDescription: jdId,
    },
    { status: 201 },
  );
}
