import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const candidatesIndex = parts.findIndex((p) => p === "candidates");
    const id = candidatesIndex >= 0 ? parts[candidatesIndex + 1] : undefined;
    const supabase = await createServiceClient();

    const { data: candidate } = await supabase.from("candidates").select("resume_url").eq("id", id).single();
    const candidateRow = candidate as { resume_url?: string } | null;
    const resumePath = candidateRow?.resume_url;
    if (!resumePath) return NextResponse.json({ error: "No resume for candidate" }, { status: 404 });

    // resumePath expected to be 'resumes/<filename>' or just filename
    const bucket = resumePath.startsWith("resumes/") ? "resumes" : "resumes";
    const filename = resumePath.startsWith("resumes/") ? resumePath.replace(/^resumes\//, "") : resumePath;

    // Create a signed download URL (short lived)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
    const signEndpoint = `${supabaseUrl}/storage/v1/object/sign/${bucket}/${encodeURIComponent(filename)}`;

    const signRes = await fetch(signEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 60 * 5 }),
    });

    if (!signRes.ok) {
      const txt = await signRes.text().catch(() => "");
      return NextResponse.json({ error: `Failed to sign download url: ${txt}` }, { status: 500 });
    }

    const signJson = await signRes.json().catch(() => ({}));
    const downloadUrl = signJson?.signedURL ?? signJson?.signedUrl ?? signJson?.signed_url ?? null;
    if (!downloadUrl) return NextResponse.json({ error: "No download url" }, { status: 500 });

    return NextResponse.json({ url: downloadUrl }, { status: 200 });
  } catch (err) {
    console.error("candidate resume download url error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
