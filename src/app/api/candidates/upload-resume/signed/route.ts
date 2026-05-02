import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const originalName = body?.filename as string | undefined;
    const contentType = body?.contentType as string | undefined;

    const supabase = await createServiceClient();
    const bucket = "resumes";

    // Ensure the bucket exists. If not, create it as private.
    try {
      const { data: existing } = (await supabase.storage.getBucket) ? await supabase.storage.getBucket(bucket) : { data: null };
      if (!existing) {
        try {
          // create bucket as private
          await supabase.storage.createBucket(bucket, { public: false });
        } catch (createErr) {
          console.warn("Could not create bucket programmatically:", createErr);
          // proceed — signing will fail with clearer error below
        }
      }
    } catch (e) {
      // ignore and continue to attempt signing; we'll surface any errors from the sign endpoint
      console.warn("Bucket existence check failed:", e);
    }
    const filename = `${randomBytes(8).toString("hex")}-${originalName ?? "resume.pdf"}`;

    // Use Supabase Storage REST API to create a signed upload URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
    const signEndpoint = `${supabaseUrl}/storage/v1/object/sign/${bucket}/${encodeURIComponent(filename)}`;

    let signRes = await fetch(signEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 60 * 60 }),
    });

    // If signing fails because the object doesn't exist (Supabase returns not_found),
    // attempt to create a zero-byte placeholder object, then retry signing.
    if (!signRes.ok) {
      const txt = await signRes.text().catch(() => "");
      // Try to detect not_found (404) which is common when signing non-existent objects
      if (signRes.status === 404 || /not_found/i.test(txt)) {
        try {
          const putEndpoint = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(filename)}`;
          // Create an empty object so signing can succeed. Use service role key.
          const putRes = await fetch(putEndpoint, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": contentType || "application/octet-stream",
              "Content-Length": "0",
            },
            body: "",
          });

          if (putRes.ok) {
            // retry signing
            signRes = await fetch(signEndpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ expiresIn: 60 * 60 }),
            });
          } else {
            const putTxt = await putRes.text().catch(() => "");
            console.warn("Failed to create placeholder object for signing:", putRes.status, putTxt);
          }
        } catch (putErr) {
          console.warn("Placeholder creation for signing failed:", putErr);
        }
      } else {
        return NextResponse.json({ error: `Failed to create signed upload url: ${txt}` }, { status: 500 });
      }
    }

    if (!signRes.ok) {
      // If signing still fails, return a graceful fallback instructing client to use server upload
      const fallback = {
        error: "Signed upload URL unavailable",
        fallbackUpload: "/api/candidates/upload-resume",
        filename,
      };
      return NextResponse.json(fallback, { status: 202 });
    }

    const signJson = await signRes.json().catch(() => ({}));
    const uploadUrl = signJson?.signedURL ?? signJson?.signedUrl ?? signJson?.signed_url ?? signJson?.url ?? null;

    if (!uploadUrl) {
      return NextResponse.json({ error: "Signed upload URL not returned by Supabase" }, { status: 500 });
    }

    return NextResponse.json({ uploadUrl, filename }, { status: 200 });
  } catch (err) {
    console.error("signed upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
