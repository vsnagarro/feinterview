import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("🔧 Setting up test credentials...\n");

    // 1. Create Interviewer Records (using predefined UUIDs)
    const adminId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    const interviewerId = "f47ac10b-58cc-4372-a567-0e02b2c3d480";

    console.log("📝 Creating interviewer records...");
    const dummyHash = "$2a$10$dummy.hash.for.test.credentials.only.not.used";
    const { error: intError } = await supabase.from("interviewers").insert([
      {
        id: adminId,
        email: "admin@feinterview.dev",
        name: "Admin User",
        password_hash: dummyHash,
        created_at: new Date().toISOString(),
      },
      {
        id: interviewerId,
        email: "interviewer@feinterview.dev",
        name: "Test Interviewer",
        password_hash: dummyHash,
        created_at: new Date().toISOString(),
      },
    ]);

    if (intError) throw intError;
    console.log("✅ Interviewer records created");

    // 2. Create Candidate
    console.log("📝 Creating test candidate...");
    const { data: candidates, error: candError } = await supabase
      .from("candidates")
      .insert([
        {
          name: "Test Candidate",
          email: "candidate@test.dev",
          experience_level: "mid",
          skills: ["React", "JavaScript", "Node.js"],
          summary: "Mid-level developer for testing",
          created_by_id: adminId,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (candError) throw candError;
    const candidateId = candidates?.[0]?.id;
    console.log("✅ Candidate created:", candidateId);

    // 3. Create Job Description
    console.log("📝 Creating job description...");
    const { data: jobs, error: jobError } = await supabase
      .from("job_descriptions")
      .insert([
        {
          title: "Frontend React Developer",
          description: "Build modern React components and user interfaces",
          required_skills: ["React", "JavaScript", "CSS"],
          tech_stack: ["React", "Next.js", "Tailwind CSS", "TypeScript"],
          experience_level: "mid",
          created_by_id: adminId,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (jobError) throw jobError;
    const jobId = jobs?.[0]?.id;
    console.log("✅ Job description created:", jobId);

    // 4. Create Interview Session
    console.log("📝 Creating interview session...");
    const token = randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes from now

    const { data: sessionsList, error: sessError } = await supabase
      .from("sessions")
      .insert([
        {
          challenge_token: token,
          expires_at: expiresAt.toISOString(),
          languages: ["javascript", "typescript"],
          interviewer_id: adminId,
          candidate_id: candidateId,
          job_description_id: jobId,
          status: "active",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (sessError) throw sessError;
    const sessionId = sessionsList?.[0]?.id;
    console.log("✅ Interview session created:", sessionId);

    // Return success response
    return NextResponse.json({
      success: true,
      message: "✅ Setup complete! Test credentials created.",
      credentials: {
        admin: {
          email: "admin@feinterview.dev",
          password: "AdminPass123!",
          loginUrl: "http://localhost:3000/login",
        },
        interviewer: {
          email: "interviewer@feinterview.dev",
          password: "InterviewPass123!",
          loginUrl: "http://localhost:3000/login",
        },
        publicChallenge: {
          url: `http://localhost:3000/challenge/${token}`,
          expires: "In 30 minutes",
          noLoginRequired: true,
        },
        database: {
          adminId,
          interviewerId,
          candidateId,
          jobId,
          sessionId,
          challengeToken: token,
        },
      },
      notes: [
        "✨ You still need to create auth users in Supabase Console",
        "🔗 https://supabase.com/dashboard/project/eyvmfcjpqkrxahsipqiv/auth/users",
        "📝 Create 2 users with the credentials above",
        "🎯 After that, login at http://localhost:3000/login",
      ],
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
