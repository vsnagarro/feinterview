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
  const [jd, setJd] = useState({
    title: "",
    description: "",
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("mid");
  const [questionCount, setQuestionCount] = useState("10");
  const challengeCount = 10;
  const [result, setResult] = useState<{
    questions: GeneratedQuestion[];
    snippets: GeneratedSnippet[];
    sessionId: string;
  } | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  async function handleCreateSession() {
    setLoading(true);
    setStep("generating");
    setProgressMessage("Preparing AI generation...");

    try {
      // Create session
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
        }),
      });

      if (!res.ok) throw new Error("Failed to create session");
      const { session } = await res.json();

      // Generate questions via SSE
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
