"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SandpackConsole, SandpackLayout, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useCodeSync } from "@/lib/realtime/useCodeSync";
import {
  createWorkspace,
  deserializeWorkspace,
  flattenWorkspaceForSubmission,
  inferWorkspaceTemplate,
  serializeWorkspace,
  toSandpackRuntime,
  updateWorkspaceFile,
  type WorkspaceState,
} from "@/lib/challenge/workspace";
import { WORKSPACE_TEMPLATE_LABELS, type WorkspaceTemplate } from "@/types/app";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Challenge {
  id: string;
  title?: string;
  problemStatement?: string;
  useCase?: string;
  requirements: string[];
  workspaceTemplate: WorkspaceTemplate;
  sandboxDependencies: Record<string, string>;
  starterCode?: string | null;
  languages: string[];
  timeLimitMinutes?: number;
}

interface Candidate {
  id: string;
  name: string;
  experience_level?: string;
}

interface JobDescription {
  id: string;
  title: string;
  description: string;
  required_skills?: string[];
  tech_stack?: string[];
}

interface LiveCodeState {
  code: string;
  language: string;
  updated_at: string;
}

interface ChallengeData {
  session: Challenge;
  candidate: Candidate;
  jobDescription: JobDescription;
  linkId?: string;
  liveCodeState?: LiveCodeState | null;
}

interface Submission {
  id: string;
  code: string;
  language: string;
  submitted_at: string;
}

export function PublicChallengeClient({ token }: { token: string }) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [runtimeLanguage, setRuntimeLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [runtimeVersion, setRuntimeVersion] = useState(1);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [connected, setConnected] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { syncCode } = useCodeSync({
    linkId: challenge?.linkId,
    onConnected: () => setConnected(true),
  });

  const loadChallenge = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenge-links/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { reason?: string }).reason || "Challenge not found");
      }

      const data: ChallengeData = await res.json();
      const template = inferWorkspaceTemplate(data.session.workspaceTemplate, data.session.starterCode);
      const fallbackWorkspace = createWorkspace(template, data.session.starterCode);
      const isHookStyleStarter = /(function use[A-Z]|const use[A-Z]|export function use[A-Z]|interface\s+[A-Z]|type\s+[A-Z])/.test(data.session.starterCode || "");
      const savedTemplate = (() => {
        try {
          return data.liveCodeState?.code ? (JSON.parse(data.liveCodeState.code) as { template?: WorkspaceTemplate }).template : undefined;
        } catch {
          return undefined;
        }
      })();
      const shouldUseSavedWorkspace = !!data.liveCodeState?.code && !(savedTemplate === "vanilla" && template === "react") && !(template === "react" && isHookStyleStarter);
      const restoredWorkspace = shouldUseSavedWorkspace ? deserializeWorkspace(data.liveCodeState?.code, template, data.session.starterCode) : fallbackWorkspace;

      setChallenge({
        ...data,
        session: {
          ...data.session,
          workspaceTemplate: template,
        },
      });
      setWorkspace(restoredWorkspace);
      setRuntimeLanguage(data.liveCodeState?.language || data.session.languages[0]?.toLowerCase() || "javascript");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load challenge");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const activeFile = useMemo(() => workspace?.files.find((file) => file.path === workspace.activePath) ?? null, [workspace]);
  const sandpackRuntime = useMemo(() => (workspace && challenge ? toSandpackRuntime(workspace, challenge.session.sandboxDependencies) : null), [challenge, workspace]);

  const persistWorkspace = useCallback(
    (nextWorkspace: WorkspaceState, nextLanguage: string) => {
      if (!challenge?.linkId) return;
      setSaveState("saving");
      syncCode(serializeWorkspace(nextWorkspace), nextLanguage);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveState("saved"), 2300);
    },
    [challenge?.linkId, syncCode],
  );

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (!workspace || !activeFile) return;
      const nextWorkspace = updateWorkspaceFile(workspace, activeFile.path, value || "");
      setWorkspace(nextWorkspace);
      persistWorkspace(nextWorkspace, runtimeLanguage);
    },
    [activeFile, persistWorkspace, runtimeLanguage, workspace],
  );

  const handleRun = useCallback(() => {
    setRuntimeVersion((current) => current + 1);
  }, []);

  const handleSubmit = async () => {
    if (!workspace) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const submissionCode = flattenWorkspaceForSubmission(workspace);
      const res = await fetch(`/api/challenge-links/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: submissionCode, language: runtimeLanguage }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Failed to submit code");
      }

      const data = await res.json();
      setSuccess("Code submitted successfully!");
      setSubmissions((prev) => [
        {
          id: (data as { id?: string }).id || "unknown",
          code: submissionCode,
          language: runtimeLanguage,
          submitted_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Spinner />
      </div>
    );
  }

  if (!challenge || !workspace || !activeFile || !sandpackRuntime) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-rose-300">Challenge Not Found</h1>
          <p className="text-slate-300">{error || "The challenge link is invalid or expired."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Shared coding workspace</p>
            <h1 className="text-2xl font-semibold text-white">{challenge.session.title || challenge.jobDescription.title}</h1>
            <p className="mt-1 text-sm text-slate-400">Candidate: {challenge.candidate.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{WORKSPACE_TEMPLATE_LABELS[challenge.session.workspaceTemplate]}</Badge>
            {challenge.session.timeLimitMinutes ? <Badge variant="default">{challenge.session.timeLimitMinutes} min</Badge> : null}
            <Badge variant={connected ? "success" : "default"}>{connected ? "Connected" : "Offline save"}</Badge>
            <Badge variant="default">{saveState === "saving" ? "Autosaving…" : saveState === "saved" ? "Saved" : "Idle"}</Badge>
            <select
              title="Runtime language"
              name="runtimeLanguage"
              value={runtimeLanguage}
              onChange={(event) => {
                const nextLanguage = event.target.value;
                setRuntimeLanguage(nextLanguage);
                persistWorkspace(workspace, nextLanguage);
              }}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {challenge.session.languages.map((lang) => (
                <option key={lang} value={lang.toLowerCase()}>
                  {lang}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={handleRun}>
              Run
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-white">Problem statement</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{challenge.session.problemStatement || challenge.jobDescription.description}</p>
            {challenge.session.useCase ? (
              <div className="mt-5 border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-white">Use case</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{challenge.session.useCase}</p>
              </div>
            ) : null}
            {challenge.session.requirements?.length ? (
              <div className="mt-5 border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-white">Requirements</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {challenge.session.requirements.map((requirement) => (
                    <li key={requirement} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      {requirement}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {Object.keys(challenge.session.sandboxDependencies || {}).length ? (
              <div className="mt-5 border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-white">Available packages</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                  {Object.entries(challenge.session.sandboxDependencies).map(([name, version]) => (
                    <span key={name} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      {name}@{version}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Files</h2>
              <span className="text-xs text-slate-500">{workspace.files.length} files</span>
            </div>
            <div className="space-y-1">
              {workspace.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setWorkspace({ ...workspace, activePath: file.path })}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${file.path === workspace.activePath ? "bg-cyan-500/15 text-cyan-200" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <span className="truncate">{file.path}</span>
                  <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">{file.language}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{activeFile.path}</p>
              <p className="text-xs text-slate-500">Edit the scaffold, then run the preview to validate the result.</p>
            </div>
          </div>
          <div className="h-[720px]">
            <MonacoEditor
              height="100%"
              language={activeFile.language}
              value={activeFile.code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        </section>

        <section className="grid min-h-0 grid-rows-[1fr_260px] gap-4">
          <SandpackProvider
            key={`runtime-${runtimeVersion}`}
            template={sandpackRuntime.template}
            files={sandpackRuntime.files}
            customSetup={sandpackRuntime.customSetup}
            options={{
              activeFile: sandpackRuntime.activeFile,
              visibleFiles: sandpackRuntime.visibleFiles,
              externalResources: sandpackRuntime.externalResources,
            }}
          >
            <SandpackLayout className="!h-full !rounded-none !border-0 !bg-transparent">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Preview</p>
                    <p className="text-xs text-slate-500">Sandpack runs the current workspace with a real package-aware sandbox.</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={handleRun}>
                    Run
                  </Button>
                </div>
                <div className="h-[440px] overflow-hidden">
                  <SandpackPreview className="!h-full" />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Console</p>
                  <p className="text-xs text-slate-500">Package runtime logs and build output from Sandpack.</p>
                </div>
                <div className="h-[200px] overflow-hidden">
                  <SandpackConsole className="!h-full !bg-slate-900 !text-slate-100" />
                </div>
              </div>
            </SandpackLayout>
          </SandpackProvider>
        </section>
      </div>

      {error ? <div className="mx-auto mt-2 max-w-[1600px] rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {success ? <div className="mx-auto mt-2 max-w-[1600px] rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}

      {submissions.length > 0 ? (
        <div className="mx-auto mt-4 max-w-[1600px] px-4 pb-8">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-white">Submission history</h2>
            <div className="mt-4 space-y-3">
              {submissions.map((submission, index) => (
                <div key={submission.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">Submission #{submissions.length - index}</p>
                      <p className="text-xs text-slate-500">{new Date(submission.submitted_at).toLocaleString()}</p>
                    </div>
                    <Badge variant="default">{submission.language}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
