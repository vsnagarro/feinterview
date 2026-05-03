import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GEMINI_MODELS = [
  { id: "models/gemini-2.5-flash", name: "Gemini 2.5 Flash (recommended)" },
  { id: "models/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite (fast/cheap)" },
  { id: "models/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "models/gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
  { id: "models/gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "models/gemini-1.5-pro", name: "Gemini 1.5 Pro" },
];

const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5 (recommended)" },
  { id: "claude-haiku-3-5", name: "Claude Haiku 3.5 (fast)" },
  { id: "claude-opus-4-5", name: "Claude Opus 4.5 (powerful)" },
];

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const provider = process.env.GEMINI_API_KEY ? "gemini" : "anthropic";
    const models = provider === "gemini" ? GEMINI_MODELS : ANTHROPIC_MODELS;
    return NextResponse.json({ provider, models });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
