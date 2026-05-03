import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import sharp from "sharp";

const BUCKET = "screenshots";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB raw (before compression)

/**
 * Image magic-byte signatures. Checked against actual file bytes so a renamed
 * file with a different extension can't bypass type validation.
 */
const IMAGE_MAGIC = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] }, // PNG
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] }, // JPEG
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], webp: true }, // RIFF … WEBP
] as const;

function detectImageMime(buf: Uint8Array): string | null {
  for (const sig of IMAGE_MAGIC) {
    if (buf.length >= sig.bytes.length && sig.bytes.every((b, i) => buf[i] === b)) {
      // Extra check for WEBP: bytes 8-11 must be 'W','E','B','P'
      if ("webp" in sig) {
        const webp = [0x57, 0x45, 0x42, 0x50];
        if (buf.length >= 12 && webp.every((b, i) => buf[8 + i] === b)) return "image/webp";
        continue; // RIFF but not WEBP — not accepted
      }
      return sig.mime;
    }
  }
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
    }

    const raw = await file.arrayBuffer();
    const rawBytes = new Uint8Array(raw);

    // Validate magic bytes — reject anything that isn't a recognised image format
    const detectedMime = detectImageMime(rawBytes);
    if (!detectedMime) {
      return NextResponse.json({ error: "Invalid file format. Only PNG, JPEG, and WEBP are accepted." }, { status: 400 });
    }

    // Compress + strip EXIF metadata via Sharp:
    //  - Resize to max 1920×1080 (preserving aspect, never upscale)
    //  - JPEG output at quality 85 (progressive)
    //  - Strips all EXIF/IPTC/XMP metadata automatically
    const compressed = await sharp(Buffer.from(raw)).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, progressive: true, mozjpeg: true }).toBuffer();

    const filename = `${sessionId}/${randomBytes(6).toString("hex")}.jpg`;

    const service = await createServiceClient();
    const { error: uploadError } = await service.storage.from(BUCKET).upload(filename, compressed, { contentType: "image/jpeg", upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const storagePath = `${BUCKET}/${filename}`;
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

    const { data: session } = await service.from("sessions").select("screenshot_url").eq("id", sessionId).single();

    if (session?.screenshot_url) {
      const path = session.screenshot_url.replace(/^screenshots\//, "");
      await service.storage
        .from(BUCKET)
        .remove([path])
        .catch(() => {});
    }

    await service.from("sessions").update({ screenshot_url: null }).eq("id", sessionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
