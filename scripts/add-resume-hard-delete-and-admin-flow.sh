#!/usr/bin/env bash
set -euo pipefail

BRANCH="feat/admin-resume-hard-delete"
echo "Creating branch $BRANCH"
git checkout -b "$BRANCH"

# Backups
echo "Backing up files..."
mkdir -p .backups
cp src/app/api/challenge-links/[token]/route.ts .backups/route.challenge-links.token.route.ts.bak || true
cp src/app/api/sessions/route.ts .backups/api.sessions.route.ts.bak || true
cp src/components/admin/SessionForm.tsx .backups/SessionForm.tsx.bak || true
cp src/lib/claude/prompts.ts .backups/prompts.ts.bak || true

# 1) Add DB migration: add resume_url to candidates, and extra session fields
MIGRATION_PATH="supabase/migrations/0007_add_resume_and_session_fields.sql"
echo "Creating migration $MIGRATION_PATH"
cat > "$MIGRATION_PATH" <<'SQL'
-- Add resume_url column to candidates, add extra_checks, target_level, trickiness to sessions
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS resume_url TEXT;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS extra_checks TEXT,
  ADD COLUMN IF NOT EXISTS target_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS trickiness INT;
SQL

# 2) Update challenge-links DELETE to hard delete (use .delete())
echo "Patching DELETE handler to hard-delete in src/app/api/challenge-links/[token]/route.ts"
cat > src/app/api/challenge-links/[token]/route.ts <<'TS'
import { NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";

function isUUID(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createServiceClient();

  // First, check if token matches a session.challenge_token (public session links)
  const { data: session } = await supabase
    .from("sessions")
    .select("*, candidates(id, name, email, experience_level), job_descriptions(id, title, description, required_skills, tech_stack)")
    .eq("challenge_token", token)
    .single();

  if (session) {
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" }, { status: 410 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.job_descriptions?.title ?? "Coding Challenge",
        problemStatement: session.job_descriptions?.description ?? "",
        languages: session.languages ?? ["javascript"],
        timeLimitMinutes: null,
      },
      candidate: session.candidates,
      jobDescription: session.job_descriptions,
      linkType: "session",
    });
  }

  // Otherwise treat as a challenge_link token
  const { data: link, error } = await supabase.from("challenge_links").select("*").eq("token", token).single();

  if (error || !link) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
  }

  if (!link.is_active) {
    return NextResponse.json({ valid: false, reason: "inactive" });
  }

  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  if (!link.opened_at) {
    await supabase.from("challenge_links").update({ opened_at: new Date().toISOString() }).eq("id", link.id);
  }

  const { data: challenge } = await supabase.from("code_challenges").select("*").eq("id", link.challenge_id).single();
  const { data: liveCodeState } = await supabase.from("live_code_state").select("code, language, updated_at").eq("link_id", link.id).single();

  const linkedSession = challenge?.session_id
    ? await supabase
        .from("sessions")
        .select("*, candidates(id, name, email, experience_level), job_descriptions(id, title, description, required_skills, tech_stack)")
        .eq("id", challenge.session_id)
        .single()
    : { data: null };

  const sessionData = linkedSession.data;

  return NextResponse.json({
    session: {
      id: sessionData?.id,
      title: challenge?.title,
      problemStatement: challenge?.problem_statement,
      useCase: challenge?.use_case,
      requirements: challenge?.requirements ?? [],
      workspaceTemplate: challenge?.workspace_template ?? "vanilla",
      sandboxDependencies: challenge?.sandbox_dependencies ?? {},
      starterCode: challenge?.starter_code,
      languages: challenge?.supported_languages ?? ["javascript"],
      timeLimitMinutes: challenge?.time_limit_minutes,
    },
    candidate: sessionData?.candidates ?? { id: "", name: link.candidate_name ?? "Candidate" },
    jobDescription: sessionData?.job_descriptions ?? {
      id: challenge?.id,
      title: challenge?.title,
      description: challenge?.problem_statement,
      required_skills: [],
      tech_stack: [],
    },
    linkId: link.id,
    challengeId: challenge?.id,
    expiresAt: link.expires_at,
    candidateName: link.candidate_name,
    liveCodeState,
    linkType: "challenge_link",
  });
}

// Admin actions: expire/reactivate/update expiresAt or soft-delete (deactivate) a link.
export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { action } = body as { action?: string };
  const whereField = isUUID(token) ? "id" : "token";

  try {
    if (action === "expire") {
      const { data, error } = await supabase.from("challenge_links").update({ is_active: false, expires_at: new Date().toISOString() }).eq(whereField, token).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (action === "reactivate") {
      const { data, error } = await supabase.from("challenge_links").update({ is_active: true }).eq(whereField, token).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (action === "updateExpiresAt") {
      const { expiresAt } = body as { expiresAt?: string };
      if (!expiresAt) return NextResponse.json({ error: "expiresAt required" }, { status: 400 });
      const { data, error } = await supabase.from("challenge_links").update({ expires_at: expiresAt }).eq(whereField, token).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const whereField = isUUID(token) ? "id" : "token";

  try {
    // HARD DELETE the link row (per request)
    const { data, error } = await supabase.from("challenge_links").delete().eq(whereField, token).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, link: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
TS

# 3) Add resume upload endpoint
echo "Adding resume upload API at src/app/api/candidates/upload-resume/route.ts"
mkdir -p src/app/api/candidates/upload-resume
cat > src/app/api/candidates/upload-resume/route.ts <<'TS'
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const candidateId = formData.get("candidateId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const filename = `${randomBytes(8).toString("hex")}-${(file as any).name ?? "resume.pdf"}`;
    const bucket = "resumes";

    // Upload to storage
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(filename, Buffer.from(buffer), {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    // Get public URL (ensure bucket is configured to public, or generate signed URL instead)
    const { data: publicUrlData } = await supabase.storage.from(bucket).getPublicUrl(filename);

    const publicUrl = publicUrlData?.publicUrl ?? null;

    // Optionally associate with candidate if candidateId provided
    if (candidateId && publicUrl) {
      await supabase.from("candidates").update({ resume_url: publicUrl }).eq("id", candidateId);
    }

    return NextResponse.json({ success: true, url: publicUrl }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
TS

# 4) Update sessions API to save resume_url, extra fields
echo "Patching src/app/api/sessions/route.ts to persist resume_url and session extra fields"
cat > src/app/api/sessions/route.ts <<'TS'
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

function mapExperienceLevel(yearsExp: number): "junior" | "mid" | "senior" {
  if (yearsExp >= 7) return "senior";
  if (yearsExp >= 3) return "mid";
  return "junior";
}

export async function GET() {
  const supabase = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("sessions").select("*, candidates(name, email), job_descriptions(title)").order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServiceClient();

  const body = await request.json();
  const {
    candidateName,
    candidateEmail,
    candidateNotes,
    skills,
    yearsExp,
    jdTitle,
    jdDescription,
    resumeUrl,
    extraChecks,
    targetLevel,
    trickiness,
  } = body;

  // Create a default interviewer if none exists
  const defaultInterviewerId = "00000000-0000-0000-0000-000000000001";

  // Check if default interviewer exists
  const { data: existingInterviewer } = await supabase.from("interviewers").select("id").eq("id", defaultInterviewerId).single();

  if (!existingInterviewer) {
    // Create default interviewer
    await supabase
      .from("interviewers")
      .insert({
        id: defaultInterviewerId,
        email: "admin@interview.local",
        name: "Interview Admin",
        password_hash: "system",
      })
      .select()
      .single();
  }

  // Create candidate with created_by_id; include resume_url if provided
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .insert({
      name: candidateName,
      email: candidateEmail,
      skills: skills || [],
      experience_level: mapExperienceLevel(Number(yearsExp) || 0),
      summary: candidateNotes || null,
      resume_url: resumeUrl || null,
      created_by_id: defaultInterviewerId,
    })
    .select()
    .single();

  if (candidateError) {
    console.error("Candidate creation error:", candidateError);
    return NextResponse.json({ error: candidateError.message }, { status: 500 });
  }

  // Create JD with created_by_id
  let jdId: string | null = null;
  if (jdDescription) {
    const { data: jd, error: jdError } = await supabase
      .from("job_descriptions")
      .insert({
        title: jdTitle || "Untitled Role",
        description: jdDescription,
        required_skills: skills || [],
        created_by_id: defaultInterviewerId,
      })
      .select()
      .single();

    if (jdError) {
      console.error("JD creation error:", jdError);
      return NextResponse.json({ error: jdError.message }, { status: 500 });
    }
    jdId = jd?.id;
  } else {
    // Create default JD if not provided
    const { data: jd, error: jdError } = await supabase
      .from("job_descriptions")
      .insert({
        title: jdTitle || "Frontend Interview",
        description: jdDescription || "Frontend Engineering Role",
        required_skills: skills || [],
        created_by_id: defaultInterviewerId,
      })
      .select()
      .single();

    if (jdError) {
      console.error("Default JD creation error:", jdError);
      return NextResponse.json({ error: jdError.message }, { status: 500 });
    }
    jdId = jd?.id;
  }

  // Create session with challenge token (include new session fields)
  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour default

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      challenge_token: token,
      candidate_id: candidate.id,
      job_description_id: jdId,
      interviewer_id: defaultInterviewerId,
      languages: ["javascript", "typescript"],
      status: "active",
      expires_at: expiresAt.toISOString(),
      extra_checks: extraChecks || null,
      target_level: targetLevel || null,
      trickiness: trickiness ? Number(trickiness) : null,
    })
    .select()
    .single();

  if (sessionError) {
    console.error("Session creation error:", sessionError);
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      challengeLink: `http://localhost:3000/challenge/${token}`,
      session,
      candidate,
      jobDescription: jdId,
    },
    { status: 201 },
  );
}
TS

# 5) Update AI prompt builder to include extraChecks/trickiness/targetLevel in buildGeneratePrompt
echo "Patching src/lib/claude/prompts.ts to include extra details in prompts"
cat > src/lib/claude/prompts.ts <<'TS'
import type { Difficulty, GenerateQuestionsPayload } from "@/types/app";

export const QUESTION_GENERATION_SYSTEM_PROMPT = `You are an expert frontend technical interviewer with 15+ years of experience hiring engineers at top tech companies. Your role is to generate high-quality, specific interview questions and code snippets tailored to a candidate's profile and job description.

OUTPUT FORMAT:
You must respond with a valid JSON object matching this exact schema:

{
  "questions": [
    {
      "question": "string — the interview question",
      "answer": "string — concise model answer (3-6 sentences, under 120 words)",
      "explanation": "string — brief explanation or analogous example",
      "tags": ["string", ...],
      "difficulty": "junior" | "mid" | "senior",
      "topic": "string — e.g. React hooks, CSS, Performance, etc."
    }
  ],
  "snippets": [
    {
      "title": "string — short title",
      "description": "string — what this snippet demonstrates",
      "language": "javascript" | "typescript" | "css" | "html",
      "code": "string — actual code, properly formatted, ideally under 25 lines",
      "explanation": "string — brief explanation in 2-4 sentences",
      "tags": ["string", ...],
      "difficulty": "junior" | "mid" | "senior"
    }
  ]
}

QUESTION QUALITY GUIDELINES:
- Questions should be specific, not vague ("Explain how useEffect cleanup works and when to use it" not "Tell me about React")
- Answers should be concise and interview-ready — what a strong candidate would actually say in under 120 words
- Include a mix of: conceptual understanding, practical application, debugging scenarios, and best practices
- For senior roles: include system design, performance optimization, architecture questions
- For junior roles: focus on fundamentals, common patterns, and debugging basics

CODE SNIPPET GUIDELINES:
- Include realistic, runnable code — not toy examples, and keep each snippet compact enough for a timed interview exercise
- Keep each code snippet under 25 lines unless absolutely necessary
- Cover common interview topics: closures, async/await, event delegation, React patterns, CSS layout, etc.
- Each snippet should have a clear point: demonstrating a bug, a pattern, or a concept
- Code should be production-quality style

TOPICS TO COVER (based on difficulty):
- Junior: DOM manipulation, CSS box model, array methods, closures, basic React (props/state), async/await
- Mid: React hooks, performance (memoization, virtualization), CSS advanced (grid/flex/animations), TypeScript, testing
- Senior: System design, micro-frontends, build tools, web performance (Core Web Vitals), accessibility, security (XSS/CSRF), advanced TypeScript

Respond ONLY with the JSON object. No markdown fences, no preamble, no explanation outside the JSON.`;

export const CODE_ANALYSIS_SYSTEM_PROMPT = `You are a senior frontend engineer reviewing a candidate's code submission during a technical interview. Your job is to provide constructive, insightful analysis.

OUTPUT FORMAT:
Respond with a valid JSON object:

{
  "summary": "string — 2-3 sentence overall assessment",
  "strengths": ["string", ...],
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "description": "string — what the issue is and why it matters"
    }
  ],
  "followUpQuestions": ["string", ...]
}

ANALYSIS GUIDELINES:
- Be specific — reference actual code lines/patterns you see
- Strengths: acknowledge good approaches even in flawed code
- Issues: rank by severity (critical = wrong output/crash, major = bad practice, minor = style/optimization)
- Follow-up questions: ask about their design decisions, edge cases they may have missed, how they'd improve it
- Be constructive — this is to help the interviewer probe deeper, not to judge

Respond ONLY with the JSON object.`;

export function buildGeneratePrompt(params: GenerateQuestionsPayload) {
  const skillsStr = params.skills && params.skills.length > 0 ? params.skills.join(", ") : "Not specified";
  const expStr = params.yearsExp && params.yearsExp > 0 ? `${params.yearsExp} years` : "Not specified";
  const extraChecks = params.extraChecks ? params.extraChecks : "None specified";
  const trickiness = typeof params.trickiness !== "undefined" && params.trickiness !== null ? `Trickiness score: ${params.trickiness}` : "";

  return {
    systemPrompt: QUESTION_GENERATION_SYSTEM_PROMPT,
    userMessage: `Generate interview questions for this candidate and role:

CANDIDATE:
- Name: ${params.candidateName}
- Experience: ${expStr}
- Skills: ${skillsStr}
- Extra checks: ${extraChecks}
${trickiness ? `- ${trickiness}` : ""}

JOB DESCRIPTION:
${params.jobDescription}

TARGET LEVEL: ${params.difficulty || params.targetLevel || "Not specified"}

Generate ${params.count ?? 10} questions and ${params.challengeCount ?? 10} code snippets that can be used as coding challenges. For each question include a concise answer, a short explanation or analogous example, and tags. Tailor everything to the candidate's background, job description, and extra checks. For the snippets, provide starter code and a brief explanation. Ensure diversity across difficulty levels when applicable.`,
  };
}

export function buildAnalyzePrompt(params: { problemStatement: string; code: string; language: string }) {
  return {
    systemPrompt: CODE_ANALYSIS_SYSTEM_PROMPT,
    userMessage: `Analyze this candidate's code submission:

PROBLEM STATEMENT:
${params.problemStatement}

CANDIDATE'S CODE (${params.language}):
\`\`\`${params.language}
${params.code}
\`\`\`

Provide your analysis.`,
  };
}

export function parseDifficultyFromJD(description: string): Difficulty {
  const lower = description.toLowerCase();
  if (lower.includes("senior") || lower.includes("staff") || lower.includes("lead")) return "senior";
  if (lower.includes("junior") || lower.includes("entry")) return "junior";
  return "mid";
}
TS

# 6) Update SessionForm UI to upload resume and send extra fields
echo "Patching src/components/admin/SessionForm.tsx to include resume upload and extra fields"
cat > src/components/admin/SessionForm.tsx <<'TSX'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import type { Difficulty, GeneratedQuestion, GeneratedSnippet } from "@/types/app";

type Step = "candidate" | "jd" | "review" | "generating";
type NavigableStep = "candidate" | "jd" | "review";

export function SessionForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("candidate");
  const [loading, setLoading] = useState(false);

  const [candidate, setCandidate] = useState({
    name: "",
    email: "",
    skills: "",
    yearsExp: "",
    notes: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jd, setJd] = useState({
    title: "",
    description: "",
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("mid");
  const [questionCount, setQuestionCount] = useState("10");
  const [targetLevel, setTargetLevel] = useState<string>("mid");
  const [trickiness, setTrickiness] = useState<number | null>(null);
  const [extraChecks, setExtraChecks] = useState<string>("");
  const challengeCount = 10;
  const [result, setResult] = useState<{
    questions: GeneratedQuestion[];
    snippets: GeneratedSnippet[];
    sessionId: string;
  } | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  async function uploadResume(candidateId?: string) {
    if (!resumeFile) return null;
    const fd = new FormData();
    fd.append("file", resumeFile);
    if (candidateId) fd.append("candidateId", candidateId);
    const res = await fetch("/api/candidates/upload-resume", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err?.error || "Upload failed");
    }
    const data = await res.json();
    return data.url ?? null;
  }

  async function handleCreateSession() {
    setLoading(true);
    setStep("generating");
    setProgressMessage("Preparing AI generation...");

    try {
      // If a resume is present, upload it first (we will provide resume_url when creating candidate)
      let resumeUrl: string | null = null;
      if (resumeFile) {
        try {
          resumeUrl = await uploadResume();
        } catch (err) {
          toast(err instanceof Error ? err.message : "Resume upload failed", "error");
        }
      }

      // Create session (candidate + JD + session fields)
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: candidate.name,
          candidateEmail: candidate.email || undefined,
          skills: candidate.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          yearsExp: Number(candidate.yearsExp) || 0,
          candidateNotes: candidate.notes || undefined,
          jdTitle: jd.title || undefined,
          jdDescription: jd.description || undefined,
          difficulty,
          resumeUrl,
          extraChecks,
          targetLevel,
          trickiness,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create session");
      }
      const { session } = await res.json();

      // Start AI generation (streaming)
      const genRes = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          candidateName: candidate.name,
          skills: candidate.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          yearsExp: Number(candidate.yearsExp) || 0,
          jobDescription: jd.description || `${jd.title} role`,
          difficulty,
          count: Number(questionCount),
          challengeCount,
          extraChecks,
          trickiness,
          targetLevel,
        }),
      });

      if (!genRes.ok) {
        const errorText = await genRes.text();
        throw new Error(errorText || "Failed to generate interview content");
      }

      const reader = genRes.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let generatedPayload = false;

      let streamError = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  streamError = data.error;
                  continue;
                }
                if (data.status === "progress") {
                  setProgressMessage(
                    `Generated ${data.generatedQuestions ?? 0} questions and ${data.generatedChallenges ?? 0} challenges (${data.completedBatches ?? 0}/${data.totalBatches ?? 0} batches)`,
                  );
                  continue;
                }
                generatedPayload = true;
                setResult({ ...data, sessionId: session.id });
              } catch {
                continue;
              }
            }
          }
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }

      if (!generatedPayload) {
        throw new Error("AI generation did not return any content");
      }

      toast(`Generated ${questionCount} questions and ${challengeCount} code challenges`, "success");
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast(msg, "error");
      setStep("review");
    } finally {
      setLoading(false);
    }
  }

  if (step === "generating") {
    return (
      <div className="card p-12 text-center space-y-4">
        <Spinner className="mx-auto h-8 w-8" />
        <p className="text-slate-600 font-medium">Generating questions with AI…</p>
        <p className="text-slate-400 text-sm">This can take up to a minute for larger batches</p>
        {progressMessage && <p className="text-sm text-sky-600">{progressMessage}</p>}
        {result && (
          <div className="text-left bg-slate-50 rounded-lg p-4 mt-4">
            <p className="text-sm text-emerald-600 font-medium">✓ {result.questions.length} questions generated</p>
            <p className="text-sm text-emerald-600 mt-1">✓ {result.snippets.length} code snippets generated</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(["candidate", "jd", "review"] as NavigableStep[]).map((s, i) => (
          <button key={s} onClick={() => setStep(s)} className={`flex items-center gap-2 text-sm ${step === s ? "text-sky-600 font-medium" : "text-slate-400"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-500"}`}>{i + 1}</span>
            {s === "candidate" ? "Candidate" : s === "jd" ? "Job Description" : "Review & Generate"}
            {i < 2 && <span className="text-slate-300 ml-2">→</span>}
          </button>
        ))}
      </div>

      {/* Step 1: Candidate */}
      {step === "candidate" && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Candidate Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full name *" value={candidate.name} onChange={(e) => setCandidate({ ...candidate, name: e.target.value })} placeholder="Jane Doe" required />
            <Input label="Email" type="email" value={candidate.email} onChange={(e) => setCandidate({ ...candidate, email: e.target.value })} placeholder="jane@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Skills (comma-separated)" value={candidate.skills} onChange={(e) => setCandidate({ ...candidate, skills: e.target.value })} placeholder="React, TypeScript, CSS" />
            <Input label="Years of experience" type="number" value={candidate.yearsExp} onChange={(e) => setCandidate({ ...candidate, yearsExp: e.target.value })} placeholder="3" min="0" />
          </div>
          <Textarea label="Notes" value={candidate.notes} onChange={(e) => setCandidate({ ...candidate, notes: e.target.value })} rows={2} placeholder="Any notes about the candidate…" />
          <div>
            <label className="label text-sm">Upload resume (PDF preferred)</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep("jd")} disabled={!candidate.name.trim()}>
              Next: Job Description →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: JD */}
      {step === "jd" && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Job Description</h2>
          <Input label="Role title" value={jd.title} onChange={(e) => setJd({ ...jd, title: e.target.value })} placeholder="Senior Frontend Engineer" />
          <Textarea
            label="Job description (paste the full JD for better AI questions)"
            value={jd.description}
            onChange={(e) => setJd({ ...jd, description: e.target.value })}
            rows={8}
            placeholder="Paste the job description here…"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Target level"
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              options={[
                { value: "junior", label: "Junior" },
                { value: "mid", label: "Mid-level" },
                { value: "senior", label: "Senior" },
              ]}
            />
            <Input label="Trickiness (1-10)" type="number" value={trickiness ?? ""} onChange={(e) => setTrickiness(e.target.value ? Number(e.target.value) : null)} placeholder="5" min="1" max="10" />
          </div>

          <Textarea label="Extra points to check (one per line)" value={extraChecks} onChange={(e) => setExtraChecks(e.target.value)} rows={3} placeholder="Performance, Accessibility, Security" />

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep("candidate")}>
              ← Back
            </Button>
            <Button onClick={() => setStep("review")}>Next: Review →</Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Review & Generate</h2>

          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="text-sm">
              <span className="font-medium">Candidate:</span> {candidate.name} ({candidate.yearsExp || "?"} yrs)
            </p>
            {candidate.skills && (
              <p className="text-sm">
                <span className="font-medium">Skills:</span> {candidate.skills}
              </p>
            )}
            {jd.title && (
              <p className="text-sm">
                <span className="font-medium">Role:</span> {jd.title}
              </p>
            )}
            {jd.description && (
              <p className="text-sm text-slate-500">
                {jd.description.slice(0, 200)}
                {jd.description.length > 200 ? "…" : ""}
              </p>
            )}
            {extraChecks && (
              <p className="text-sm">
                <span className="font-medium">Extra checks:</span>
                <br />
                <pre className="whitespace-pre-wrap text-xs text-slate-600">{extraChecks}</pre>
              </p>
            )}
            {resumeFile && <p className="text-xs text-slate-500">Resume attached: {resumeFile.name}</p>}
            <p className="text-xs text-slate-400">Target level: {targetLevel} {trickiness ? `· Trickiness ${trickiness}` : ""}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Difficulty level"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              options={[
                { value: "junior", label: "Junior" },
                { value: "mid", label: "Mid-level" },
                { value: "senior", label: "Senior" },
              ]}
            />
            <Select
              label="Number of questions"
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              options={[
                { value: "5", label: "5 questions" },
                { value: "10", label: "10 questions" },
                { value: "15", label: "15 questions" },
                { value: "20", label: "20 questions" },
                { value: "30", label: "30 questions" },
              ]}
            />
          </div>

          <div className="text-sm text-slate-500 bg-sky-50 border border-sky-200 rounded-lg p-3">
            AI will generate{" "}
            <strong>
              {questionCount} tailored questions + {challengeCount} code challenges
            </strong>{" "}
            based on the profile above, save the questions to the session, and create interview coding challenges.
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep("jd")}>
              ← Back
            </Button>
            <Button onClick={handleCreateSession} loading={loading}>
              Create Session & Generate Questions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
TSX

# 7) Run basic formatting (best-effort)
if command -v npm >/dev/null 2>&1; then
  echo "Running lint (if configured)..."
  npm run lint --silent || true
fi

echo "All files written. Next steps:"
echo "1) Run DB migration to add columns (use supabase CLI or psql):"
echo "   supabase db remote set <db-connection>  # if using supabase CLI"
echo "   supabase migration apply  # or run the SQL in $MIGRATION_PATH against your DB"
echo ""
echo "2) Ensure you have a Supabase storage bucket named 'resumes' and it's public or use signed URLs."
echo "   You can create a bucket in the Supabase console: Storage → Buckets → New bucket (name 'resumes')"
echo ""
echo "3) Start dev server and test:"
echo "   npm run dev"
echo ""
echo "4) Test flow:"
echo "   - Go to admin → New Interview"
echo "   - Fill candidate details, attach resume, add extra checks, select target level/trickiness"
echo "   - Create session and watch AI generation"
echo ""
echo "5) Commit changes when verified:"
echo "   git add -A"
echo "   git commit -m \"feat: resume upload, session metadata, hard-delete challenge links, enhance AI prompts & admin flow\""
echo "   git push -u origin $BRANCH"