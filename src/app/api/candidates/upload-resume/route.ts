import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const BUCKET = "resumes";

/** Allowed file magic-byte signatures. Checked against actual bytes — not the spoofable MIME header. */
const MAGIC_SIGNATURES = [
  { label: "PDF", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { label: "DOC (OLE2)", bytes: [0xd0, 0xcf, 0x11, 0xe0] }, // OLE2 compound doc
  { label: "DOCX/ZIP", bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK ZIP (Office Open XML)
  { label: "DOCX/ZIP empty", bytes: [0x50, 0x4b, 0x05, 0x06] }, // PK ZIP (empty)
] as const;

function hasValidMagic(buf: Uint8Array): boolean {
  return MAGIC_SIGNATURES.some(({ bytes }) => buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b));
}

/** Strip path separators and non-printable/special chars; cap length. */
function sanitizeFilename(raw: string): string {
  return (
    raw
      .replace(/[/\\]/g, "") // no path separators (directory traversal)
      .replace(/[^\w.\- ]/g, "_") // only word chars, dots, dashes, spaces → rest become _
      .replace(/\.{2,}/g, ".") // collapse multiple dots
      .replace(/^\./, "_") // no leading dot
      .trim()
      .slice(0, 100) || "resume.pdf"
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const candidateId = formData.get("candidateId") as string | null;

    if (!file || !candidateId) {
      return NextResponse.json({ error: "file and candidateId are required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Reject files whose actual content doesn't match a known document format
    if (!hasValidMagic(bytes)) {
      return NextResponse.json({ error: "Invalid file content. Only PDF, DOC, and DOCX are accepted." }, { status: 400 });
    }

    const safeName = sanitizeFilename(file.name || "resume.pdf");
    const storageName = `${randomBytes(8).toString("hex")}-${safeName}`;

    const supabase = await createServiceClient();
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storageName, Buffer.from(buffer), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const storagePath = `resumes/${storageName}`;
    const { error: dbError } = await supabase.from("candidates").update({ resume_url: storagePath }).eq("id", candidateId);

    if (dbError) {
      // Remove orphaned file so storage stays clean
      await supabase.storage
        .from(BUCKET)
        .remove([storageName])
        .catch(() => {});
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: storagePath }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
