#!/usr/bin/env node
// Script to delete zero-byte placeholders older than a threshold from the `resumes` bucket.
// Usage: node scripts/cleanup_placeholders.js [minutes]

import fetch from "node-fetch";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || "admin-secret";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const minutes = Number(process.argv[2] || 10);

(async function main() {
  try {
    const localApi = process.env.LOCAL_API_BASE || "http://localhost:3001";
    const res = await fetch(`${localApi.replace(/\/$/, "")}/api/admin/cleanup-placeholders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_SECRET,
      },
      body: JSON.stringify({ olderThanMinutes: minutes }),
    });
    const j = await res.json();
    console.log("result:", j);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
