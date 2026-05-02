import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const candidateId = formData.get("candidateId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const filename = `${randomBytes(8).toString("hex")}-${(file as any).name ?? "resume.pdf"}`;
    const bucket = "resumes";

    // Upload to storage
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(filename, Buffer.from(buffer), {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    // Get public URL (ensure bucket is configured to public, or generate signed URL instead)
    const { data: publicUrlData } = await supabase.storage.from(bucket).getPublicUrl(filename);

    const publicUrl = publicUrlData?.publicUrl ?? null;

    // Optionally associate with candidate if candidateId provided
    if (candidateId && publicUrl) {
      await supabase.from("candidates").update({ resume_url: publicUrl }).eq("id", candidateId);
    }

    return NextResponse.json({ success: true, url: publicUrl }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
