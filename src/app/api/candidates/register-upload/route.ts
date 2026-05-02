import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const candidateId = body?.candidateId as string | undefined;
    const filename = body?.filename as string | undefined;

    if (!candidateId || !filename) {
      return NextResponse.json({ error: "candidateId and filename required" }, { status: 400 });
    }
    const supabase = await createServiceClient();
    const bucket = "resumes";

    // Validate uploaded object by generating a short-lived signed download URL and checking headers
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

    // HEAD the signed URL to get headers (size and content-type)
    const headRes = await fetch(downloadUrl, { method: "HEAD" });
    // fallback: if HEAD not allowed, try GET with range
    let contentLength = headRes.headers.get("content-length");
    let contentType = headRes.headers.get("content-type") || "";
    if (!contentLength) {
      const rangeRes = await fetch(downloadUrl, { method: "GET", headers: { Range: "bytes=0-0" } });
      contentLength = rangeRes.headers.get("content-length");
      contentType = rangeRes.headers.get("content-type") || contentType;
    }

    const size = contentLength ? Number(contentLength) : null;

    // Validation rules
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/rtf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/octet-stream",
    ];

    if (size !== null && size > MAX_BYTES) {
      // remove object
      try {
        await supabase.storage.from(bucket).remove([filename]);
      } catch (e) {
        console.error("Failed to remove oversized object:", e);
      }
      return NextResponse.json({ error: `File too large (${size} bytes). Max is ${MAX_BYTES} bytes.` }, { status: 400 });
    }

    if (contentType && !allowedTypes.includes(contentType.split(";")[0].trim())) {
      try {
        await supabase.storage.from(bucket).remove([filename]);
      } catch (e) {
        console.error("Failed to remove invalid-type object:", e);
      }
      return NextResponse.json({ error: `Invalid content type: ${contentType}` }, { status: 400 });
    }

    // Optional malware scanning: if SCANNER_URL is configured, download the file and POST to the scanner
    const scannerUrl = process.env.SCANNER_URL;
    if (scannerUrl) {
      try {
        // download the file (only if within size limits)
        const getRes = await fetch(downloadUrl);
        if (!getRes.ok) {
          throw new Error(`Failed to fetch uploaded object for scanning: ${getRes.status}`);
        }
        const buffer = await getRes.arrayBuffer();

        // POST to scanner as binary with metadata
        const scanRes = await fetch(scannerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Filename": filename,
            "X-Candidate-Id": candidateId,
          },
          body: Buffer.from(buffer),
        });

        if (!scanRes.ok) {
          // scanner flagged or failed — remove object and return error
          try {
            await supabase.storage.from(bucket).remove([filename]);
          } catch (e) {
            console.error("Failed to remove object after scanner failure:", e);
          }
          const txt = await scanRes.text().catch(() => "scanner error");
          return NextResponse.json({ error: `File rejected by scanner: ${txt}` }, { status: 400 });
        }
      } catch (scanErr) {
        console.error("Scanner integration error:", scanErr);
        try {
          await supabase.storage.from(bucket).remove([filename]);
        } catch (e) {
          console.error("Failed to remove object after scanner error:", e);
        }
        return NextResponse.json({ error: `Scanner error: ${scanErr instanceof Error ? scanErr.message : String(scanErr)}` }, { status: 500 });
      }
    }

    // Passed validation: store storage path
    const storagePath = `resumes/${filename}`;
    await supabase.from("candidates").update({ resume_url: storagePath }).eq("id", candidateId);

    // After successful registration, proactively cleanup stale zero-byte placeholders older than 1 minute
    try {
      const { cleanupPlaceholders } = await import("@/lib/storage/cleanupPlaceholders");
      // use service client we already have
      await cleanupPlaceholders(supabase, { bucket: "resumes", olderThanMinutes: 1 });
    } catch (e) {
      console.warn("Post-register cleanup failed:", e);
    }

    return NextResponse.json({ success: true, path: storagePath }, { status: 200 });
  } catch (err) {
    console.error("register-upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
