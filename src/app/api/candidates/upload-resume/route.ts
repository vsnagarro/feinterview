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

    console.error("upload-resume: form keys:", Array.from(formData.keys()));
    if (file) {
      try {
        console.error("upload-resume: file meta ->", { name: (file as File).name, type: (file as File).type });
      } catch (e) {
        console.error("upload-resume: file meta read failed", e);
      }
    }

    const buffer = await file.arrayBuffer();
    const filename = `${randomBytes(8).toString("hex")}-${(file as File).name ?? "resume.pdf"}`;
    const bucket = "resumes";

    // Upload to storage
    const uploadRes = await supabase.storage.from(bucket).upload(filename, Buffer.from(buffer), {
      contentType: file.type || "application/pdf",
      upsert: false,
    });
    console.error("upload-resume: uploadRes ->", uploadRes);

    if (uploadRes.error) {
      console.error("upload-resume: upload error", uploadRes.error);
      return NextResponse.json({ error: uploadRes.error.message }, { status: 500 });
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
    console.error("upload-resume error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
