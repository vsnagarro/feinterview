/**
 * POST /api/gist/export
 *
 * Creates a secret GitHub Gist from a code snippet in the library.
 *
 * Requires:
 *   - Authenticated admin session
 *   - GITHUB_TOKEN env var with `gist` scope
 *
 * Body: { snippetId: string }
 * Returns: { url: string }
 */

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Auth guard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN is not configured. Add it to .env.local to enable Gist export." }, { status: 503 });
  }

  let snippetId: string;
  try {
    const body = await request.json();
    snippetId = body?.snippetId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!snippetId || typeof snippetId !== "string") {
    return NextResponse.json({ error: "snippetId is required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: snippet, error } = await service.from("code_snippets").select("title, description, language, code, explanation, tags, difficulty").eq("id", snippetId).single();

  if (error || !snippet) {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
  }

  // Build file extension from language
  const EXT: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    java: "java",
    cpp: "cpp",
    "c++": "cpp",
    c: "c",
    go: "go",
    rust: "rs",
    html: "html",
    css: "css",
    sql: "sql",
  };
  const ext = EXT[snippet.language?.toLowerCase() ?? ""] ?? "txt";
  const filename = `${
    snippet.title
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .trim()
      .replace(/ /g, "_") || "snippet"
  }.${ext}`;

  // Build description block at the top of the gist
  const descriptionLines: string[] = [];
  if (snippet.description) descriptionLines.push(snippet.description);
  if (snippet.explanation) descriptionLines.push(`\n${snippet.explanation}`);
  if (snippet.tags?.length) descriptionLines.push(`\nTags: ${snippet.tags.join(", ")}`);
  descriptionLines.push(`Difficulty: ${snippet.difficulty ?? "mid"}`);

  const gistDescription = `${snippet.title}${snippet.description ? ` — ${snippet.description}` : ""}`;
  const fileContent = descriptionLines.length ? `${descriptionLines.map((l) => `// ${l.replace(/\n/g, "\n// ")}`).join("\n")}\n\n${snippet.code}` : snippet.code;

  // Create the Gist via GitHub API
  const gistRes = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      description: gistDescription,
      public: false, // secret gist — readable via URL but not indexed
      files: {
        [filename]: { content: fileContent },
      },
    }),
  });

  if (!gistRes.ok) {
    const txt = await gistRes.text().catch(() => "");
    return NextResponse.json({ error: `GitHub API error (${gistRes.status}): ${txt}` }, { status: 502 });
  }

  const gist = await gistRes.json();
  return NextResponse.json({ url: gist.html_url }, { status: 201 });
}
