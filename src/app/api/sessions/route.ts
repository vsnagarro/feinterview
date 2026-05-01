import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

function mapExperienceLevel(yearsExp: number): "junior" | "mid" | "senior" {
  if (yearsExp >= 7) return "senior";
  if (yearsExp >= 3) return "mid";
  return "junior";
}

export async function GET() {
  const supabase = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("sessions").select("*, candidates(name, email), job_descriptions(title)").order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServiceClient();

  const body = await request.json();
  const { candidateName, candidateEmail, candidateNotes, skills, yearsExp, jdTitle, jdDescription } = body;

  // Create a default interviewer if none exists
  const defaultInterviewerId = "00000000-0000-0000-0000-000000000001";

  // Check if default interviewer exists
  const { data: existingInterviewer } = await supabase.from("interviewers").select("id").eq("id", defaultInterviewerId).single();

  if (!existingInterviewer) {
    // Create default interviewer
    await supabase
      .from("interviewers")
      .insert({
        id: defaultInterviewerId,
        email: "admin@interview.local",
        name: "Interview Admin",
        password_hash: "system",
      })
      .select()
      .single();
  }

  // Create candidate with created_by_id
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .insert({
      name: candidateName,
      email: candidateEmail,
      skills: skills || [],
      experience_level: mapExperienceLevel(Number(yearsExp) || 0),
      summary: candidateNotes || null,
      created_by_id: defaultInterviewerId,
    })
    .select()
    .single();

  if (candidateError) {
    console.error("Candidate creation error:", candidateError);
    return NextResponse.json({ error: candidateError.message }, { status: 500 });
  }

  // Create JD with created_by_id
  let jdId: string | null = null;
  if (jdDescription) {
    const { data: jd, error: jdError } = await supabase
      .from("job_descriptions")
      .insert({
        title: jdTitle || "Untitled Role",
        description: jdDescription,
        required_skills: skills || [],
        created_by_id: defaultInterviewerId,
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
        description: jdDescription || "Frontend Engineering Role",
        required_skills: skills || [],
        created_by_id: defaultInterviewerId,
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

  // Use sessions table with correct schema
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      challenge_token: token,
      candidate_id: candidate.id,
      job_description_id: jdId,
      interviewer_id: defaultInterviewerId,
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
