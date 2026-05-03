import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = await createServiceClient();
    const bucket = "screenshots";

    // Ensure bucket exists (private)
    try {
      const { data: existing } = await service.storage.getBucket(bucket);
      if (!existing) {
        await service.storage.createBucket(bucket, { public: false });
      }
    } catch {
      // ignore — attempt upload anyway
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Validate MIME type — only accept standard images
    const allowedMime = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    const mimeType = file.type.split(";")[0].trim();
    if (!allowedMime.includes(mimeType)) {
      return NextResponse.json({ error: `Invalid file type: ${mimeType}. Only PNG, JPG, WEBP, or GIF allowed.` }, { status: 400 });
    }
    // 10 MB server-side cap
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
    }

    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
    const filename = `${sessionId}/${randomBytes(6).toString("hex")}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await service.storage.from(bucket).upload(filename, Buffer.from(buffer), { contentType: mimeType, upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    // Store path in sessions.screenshot_url
    const storagePath = `${bucket}/${filename}`;
    const { error: patchError } = await service.from("sessions").update({ screenshot_url: storagePath }).eq("id", sessionId);

    if (patchError) return NextResponse.json({ error: patchError.message }, { status: 500 });

    return NextResponse.json({ success: true, path: storagePath }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = await createServiceClient();

    // Get current screenshot_url to know what to delete from storage
    const { data: session } = await service.from("sessions").select("screenshot_url").eq("id", sessionId).single();

    if (session?.screenshot_url) {
      const path = session.screenshot_url.replace(/^screenshots\//, "");
      await service.storage
        .from("screenshots")
        .remove([path])
        .catch(() => {});
    }

    await service.from("sessions").update({ screenshot_url: null }).eq("id", sessionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
