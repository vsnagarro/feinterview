import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const originalName = body?.filename as string | undefined;

    const supabase = await createServiceClient();
    const bucket = "resumes";

    // Ensure bucket exists
    try {
      const { data: existing } = await supabase.storage.getBucket(bucket);
      if (!existing) await supabase.storage.createBucket(bucket, { public: false });
    } catch {
      // ignore — upload will surface any real errors
    }

    const filename = `${randomBytes(8).toString("hex")}-${originalName ?? "resume.pdf"}`;

    // createSignedUploadUrl handles correct URL construction — no placeholder needed
    const { data: signData, error: signError } = await supabase.storage.from(bucket).createSignedUploadUrl(filename, { upsert: true });

    if (signError || !signData || !signData.signedUrl) {
      return NextResponse.json(
        {
          error: "Signed upload URL unavailable",
          fallbackUpload: "/api/candidates/upload-resume",
          filename,
        },
        { status: 202 },
      );
    }

    return NextResponse.json({ uploadUrl: signData.signedUrl, filename }, { status: 200 });
  } catch (err) {
    console.error("signed upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
