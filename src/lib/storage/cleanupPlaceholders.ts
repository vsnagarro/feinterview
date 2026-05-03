import type { SupabaseClient } from "@supabase/supabase-js";

export async function cleanupPlaceholders(supabase: SupabaseClient, opts: { bucket?: string; olderThanMinutes?: number } = {}): Promise<string[]> {
  const bucket = opts.bucket ?? "resumes";
  const olderThanMinutes = opts.olderThanMinutes ?? 10;

  const now = Date.now();
  const thresholdMs = olderThanMinutes * 60 * 1000;
  const deleted: string[] = [];
  let page = 0;
  const perPage = 100;

  while (true) {
    const listRes = await supabase.storage.from(bucket).list("", {
      limit: perPage,
      offset: page * perPage,
    });

    const data = listRes.data;
    const error = listRes.error;

    if (error) throw error;
    if (!data || data.length === 0) break;

    type StoredItem = { name: string; size?: number; created_at?: string };
    for (const obj of data) {
      const item = obj as unknown as StoredItem;
      const size = item.size ?? 0;
      const createdAt = item.created_at ? new Date(item.created_at).getTime() : null;
      if (size === 0 && createdAt && now - createdAt > thresholdMs) {
        const { error: delErr } = await supabase.storage.from(bucket).remove([obj.name]);
        if (!delErr) deleted.push(obj.name);
      }
    }

    if (data.length < perPage) break;
    page++;
  }

  return deleted;
}
