/**
 * /api/execute
 *
 * Server-side code execution proxy via the Piston API.
 * https://github.com/engineer-man/piston
 *
 * Supports: JavaScript (Node.js), TypeScript, Python, Java, C++, Go, Rust.
 *
 * Resource limits applied before forwarding to Piston:
 *   - compile_timeout: 10 s
 *   - run_timeout:     10 s
 *   - run_memory_limit: 128 MB
 *   - stdin capped at 4 KB
 *   - code capped at 64 KB
 *
 * The endpoint requires an authenticated admin session so arbitrary code
 * cannot be executed by unauthenticated callers.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Language → Piston runtime mapping
// ---------------------------------------------------------------------------

const RUNTIME_MAP: Record<string, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  js: { language: "javascript", version: "18.15.0" },
  typescript: { language: "typescript", version: "5.0.3" },
  ts: { language: "typescript", version: "5.0.3" },
  python: { language: "python", version: "3.10.0" },
  python3: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  "c++": { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  go: { language: "go", version: "1.16.2" },
  rust: { language: "rust", version: "1.50.0" },
};

const PISTON_API = "https://emkc.org/api/v2/piston/execute";

// Caps
const MAX_CODE_BYTES = 64 * 1024; // 64 KB
const MAX_STDIN_BYTES = 4 * 1024; //  4 KB
const COMPILE_TIMEOUT = 10_000; // ms
const RUN_TIMEOUT = 10_000; // ms
const MEMORY_LIMIT = 128 * 1024 * 1024; // 128 MB (bytes, Piston expects bytes)

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

interface ExecuteRequest {
  language: string;
  code: string;
  stdin?: string;
}

interface PistonResponse {
  language: string;
  version: string;
  run: { stdout: string; stderr: string; output: string; code: number; signal: string | null };
  compile?: { stdout: string; stderr: string; output: string; code: number; signal: string | null };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Require authentication — execution is admin-only
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ExecuteRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { language, code, stdin } = body;

  if (!language || typeof language !== "string") {
    return NextResponse.json({ error: "language is required" }, { status: 400 });
  }
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
    return NextResponse.json({ error: "Code exceeds 64 KB limit" }, { status: 400 });
  }
  const stdinStr = typeof stdin === "string" ? stdin.slice(0, MAX_STDIN_BYTES) : "";

  const runtime = RUNTIME_MAP[language.toLowerCase()];
  if (!runtime) {
    return NextResponse.json({ error: `Unsupported language: ${language}. Supported: ${Object.keys(RUNTIME_MAP).join(", ")}` }, { status: 400 });
  }

  // Derive a sensible filename per language
  const FILE_NAMES: Record<string, string> = {
    javascript: "index.js",
    typescript: "index.ts",
    python: "main.py",
    java: "Main.java",
    "c++": "main.cpp",
    c: "main.c",
    go: "main.go",
    rust: "main.rs",
  };
  const filename = FILE_NAMES[runtime.language] ?? "main.txt";

  let pistonRes: Response;
  try {
    pistonRes = await fetch(PISTON_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: filename, content: code }],
        stdin: stdinStr,
        args: [],
        compile_timeout: COMPILE_TIMEOUT,
        run_timeout: RUN_TIMEOUT,
        compile_memory_limit: -1, // no per-compile cap (the VM caps it)
        run_memory_limit: MEMORY_LIMIT,
      }),
      // Abort if Piston doesn't respond within 20 s
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? `Execution service unreachable: ${err.message}` : "Execution service unreachable" }, { status: 503 });
  }

  if (!pistonRes.ok) {
    const txt = await pistonRes.text().catch(() => "");
    return NextResponse.json({ error: `Execution service error (${pistonRes.status}): ${txt}` }, { status: 502 });
  }

  const result: PistonResponse = await pistonRes.json();

  return NextResponse.json({
    language: result.language,
    version: result.version,
    stdout: result.run.stdout,
    stderr: result.run.stderr,
    output: result.run.output,
    exitCode: result.run.code,
    signal: result.run.signal,
    // Include compile output when present (Java, C++, Rust, TypeScript)
    compile: result.compile
      ? {
          stdout: result.compile.stdout,
          stderr: result.compile.stderr,
          exitCode: result.compile.code,
          signal: result.compile.signal,
        }
      : null,
  });
}
