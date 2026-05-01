import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServiceClient();

    // Delete all data
    console.log("🗑️  Cleaning up all data...");

    const { error: sessionErr } = await supabase.from("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (sessionErr) console.error("Sessions delete error:", sessionErr);

    const { error: submissionErr } = await supabase.from("code_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (submissionErr) console.error("Submissions delete error:", submissionErr);

    const { error: candidateErr } = await supabase.from("candidates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (candidateErr) console.error("Candidates delete error:", candidateErr);

    const { error: jdErr } = await supabase.from("job_descriptions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (jdErr) console.error("JD delete error:", jdErr);

    const { error: qErr } = await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (qErr) console.error("Questions delete error:", qErr);

    const { error: sErr } = await supabase.from("code_snippets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (sErr) console.error("Snippets delete error:", sErr);

    console.log("✅ Cleanup complete");
    return NextResponse.json({ success: true, message: "Database cleaned" }, { status: 200 });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
