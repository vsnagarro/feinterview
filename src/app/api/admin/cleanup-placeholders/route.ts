import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { cleanupPlaceholders } from "@/lib/storage/cleanupPlaceholders";

// Protected admin endpoint to remove zero-byte placeholder objects from the `resumes` bucket.
// Accepts optional JSON body: { olderThanMinutes: number } default 10 minutes.
export async function POST(request: Request) {
  try {
    const auth = request.headers.get("x-admin-secret");
    const serverSecret = process.env.ADMIN_API_SECRET;
    if (!serverSecret) {
      console.error("ADMIN_API_SECRET not configured on server");
      return NextResponse.json({ error: "server misconfiguration" }, { status: 500 });
    }
    if (!auth || auth !== serverSecret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const olderThanMinutes = Number(body?.olderThanMinutes ?? 10);
    const supabase = await createServiceClient();

    try {
      const deleted = await cleanupPlaceholders(supabase, { bucket: "resumes", olderThanMinutes });
      return NextResponse.json({ deleted, count: deleted.length }, { status: 200 });
    } catch (err) {
      console.error("cleanup error", err);
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  } catch (err) {
    console.error("cleanup error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
