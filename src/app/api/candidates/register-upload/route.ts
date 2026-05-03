import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const BUCKET = "resumes";

/** Allowed file magic-byte signatures checked against the first bytes of the uploaded object. */
const MAGIC_SIGNATURES = [
  { label: "PDF", bytes: [0x25, 0x50, 0x44, 0x46] },         // %PDF
  { label: "DOC (OLE2)", bytes: [0xd0, 0xcf, 0x11, 0xe0] },   // OLE2 compound doc
  { label: "DOCX/ZIP", bytes: [0x50, 0x4b, 0x03, 0x04] },     // PK ZIP (Office Open XML)
  { label: "DOCX/ZIP empty", bytes: [0x50, 0x4b, 0x05, 0x06] },
] as const;

function hasValidMagic(buf: Uint8Array): boolean {
  return MAGIC_SIGNATURES.some(({ bytes }) =>
    buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const candidateId = body?.candidateId as string | undefined;
    const filename = body?.filename as string | undefined;

    if (!candidateId || !filename) {
      return NextResponse.json({ error: "candidateId and filename required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 1. Confirm the object exists and check its size via storage metadata
    const { data: objectInfo, error: listError } = await supabase.storage
      .from(BUCKET)
      .list("", { search: filename, limit: 1 });

    if (listError || !objectInfo?.length) {
      return NextResponse.json({ error: "Uploaded file not found in storage" }, { status: 404 });
    }

    const metadata = objectInfo[0];
    const fileSize = metadata?.metadata?.size as number | undefined;
    if (fileSize !== undefined && fileSize > MAX_BYTES) {
      await supabase.storage.from(BUCKET).remove([filename]).catch(() => {});
      return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
    }

    // 2. Download first 16 bytes via a signed URL to validate magic bytes
    const { data: signData, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filename, 30); // 30-second read URL

    if (!signError && signData?.signedUrl) {
      const rangeRes = await fetch(signData.signedUrl, {
        headers: { Range: "bytes=0-15" },
      }).catch(() => null);

      if (rangeRes && (rangeRes.ok || rangeRes.status === 206)) {
        const firstBytes = new Uint8Array(await rangeRes.arrayBuffer());
        if (!hasValidMagic(firstBytes)) {
          await supabase.storage.from(BUCKET).remove([filename]).catch(() => {});
          return NextResponse.json(
            { error: "Invalid file content. Only PDF, DOC, and DOCX are accepted." },
            { status: 400 },
          );
        }
      }
    }

    // 3. Record the storage path on the candidate row
    const storagePath = `resumes/${filename}`;
    const { error: dbError } = await supabase
      .from("candidates")
      .update({ resume_url: storagePath })
      .eq("id", candidateId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: storagePath }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}


