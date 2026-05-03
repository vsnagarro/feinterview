"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SandpackConsole, SandpackLayout, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
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
import type { editor as MonacoEditorNS } from "monaco-editor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/** Languages executed in-browser by Sandpack; others go to the /api/execute server. */
const SANDPACK_LANGS = new Set(["javascript", "typescript", "html", "css", "jsx", "tsx"]);

interface ExecutionOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  compile?: { stderr: string; exitCode: number } | null;
}

// ResizablePanel component for draggable separators
function ResizablePanelSeparator({ onDragStart, direction = "vertical" }: { onDragStart: (e: React.MouseEvent) => void; direction?: "vertical" | "horizontal" }) {
  return (
    <div
      onMouseDown={onDragStart}
      className={`bg-white/5 hover:bg-cyan-500/20 transition-colors ${direction === "vertical" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}`}
      style={{ userSelect: "none" }}
    />
  );
}

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

export function PublicChallengeClient({ token }: { token: string }) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [runtimeLanguage, setRuntimeLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [runtimeVersion, setRuntimeVersion] = useState(1);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [connected, setConnected] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(420);
  const [problemStatementHeight, setProblemStatementHeight] = useState(45);
  const [rightPanelSplitRatio, setRightPanelSplitRatio] = useState(0.5);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [serverRunning, setServerRunning] = useState(false);
  const [execOutput, setExecOutput] = useState<ExecutionOutput | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  // Flag set to true while executeEdits is running so handleCodeChange ignores
  // the onChange event it fires — prevents re-broadcasting back to the sender.
  const isRemoteUpdate = useRef(false);

  const { syncCode } = useCodeSync({
    linkId: challenge?.linkId,
    onConnected: () => setConnected(true),
    onCodeUpdate: (code: string, language: string) => {
      // Deserialize the incoming workspace snapshot
      try {
        const updatedWorkspace = deserializeWorkspace(code, workspace?.template || "vanilla", workspace?.files[0]?.code);
        // Update the editor with the active file's code, NOT the raw JSON
        const activeCode = updatedWorkspace.files.find((f) => f.path === updatedWorkspace.activePath)?.code ?? "";
        const ed = editorRef.current;
        if (ed) {
          const model = ed.getModel();
          if (model && model.getValue() !== activeCode) {
            isRemoteUpdate.current = true;
            const savedSelection = ed.getSelection();
            const fullRange = model.getFullModelRange();
            ed.executeEdits("remote-sync", [{ range: fullRange, text: activeCode, forceMoveMarkers: false }]);
            isRemoteUpdate.current = false;
            if (savedSelection) ed.setSelection(savedSelection);
          }
        }
        setWorkspace(updatedWorkspace);
        setRuntimeLanguage(language);
      } catch {
        // If deserialization fails, treat as plain code for active file
        if (workspace && activeFile) {
          const ed = editorRef.current;
          if (ed) {
            const model = ed.getModel();
            if (model && model.getValue() !== code) {
              isRemoteUpdate.current = true;
              const savedSelection = ed.getSelection();
              const fullRange = model.getFullModelRange();
              ed.executeEdits("remote-sync", [{ range: fullRange, text: code, forceMoveMarkers: false }]);
              isRemoteUpdate.current = false;
              if (savedSelection) ed.setSelection(savedSelection);
            }
          }
          setWorkspace(updateWorkspaceFile(workspace, activeFile.path, code));
        }
      }
    },
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

  const handleAddNewFile = useCallback(() => {
    if (!workspace || !newFileName.trim()) return;
    const trimmed = newFileName.trim().replace(/^\//, ""); // strip accidental leading slash
    const language =
      trimmed.endsWith(".tsx") || trimmed.endsWith(".jsx")
        ? "tsx"
        : trimmed.endsWith(".ts") || trimmed.endsWith(".js")
          ? "javascript"
          : trimmed.endsWith(".css")
            ? "css"
            : trimmed.endsWith(".html")
              ? "html"
              : "javascript";
    // Check if file already exists (compare bare names)
    if (workspace.files.some((f) => f.path.replace(/^\//, "") === trimmed)) {
      alert("File already exists!");
      return;
    }
    const newFile = { path: trimmed, language, code: "" };
    const updatedWorkspace = { ...workspace, files: [...workspace.files, newFile], activePath: trimmed };
    setWorkspace(updatedWorkspace);
    setNewFileName("");
    setShowNewFileInput(false);
    syncCode(serializeWorkspace(updatedWorkspace), runtimeLanguage);
  }, [workspace, newFileName, runtimeLanguage, syncCode]);
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
      // Ignore onChange events fired by executeEdits during a remote update
      if (isRemoteUpdate.current) return;
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

  /** Runs the active file's code on the server for non-browser languages. */
  const handleServerRun = useCallback(async () => {
    if (!activeFile || serverRunning) return;
    setServerRunning(true);
    setExecOutput(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: runtimeLanguage, code: activeFile.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExecOutput({ stdout: "", stderr: data.error ?? "Execution failed", exitCode: 1 });
        return;
      }
      setExecOutput({
        stdout: data.stdout ?? "",
        stderr: data.stderr ?? "",
        exitCode: data.exitCode ?? null,
        compile: data.compile ?? null,
      });
    } catch {
      setExecOutput({ stdout: "", stderr: "Could not reach execution service", exitCode: 1 });
    } finally {
      setServerRunning(false);
    }
  }, [activeFile, runtimeLanguage, serverRunning]);

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
      void data; // submission stored server-side; no local list needed
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle left panel resize
  const handleLeftPanelResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = leftPanelWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(250, Math.min(600, startWidth + delta));
        setLeftPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [leftPanelWidth],
  );

  // Handle right panel resize
  const handleRightPanelResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = rightPanelWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(300, Math.min(600, startWidth - delta));
        setRightPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [rightPanelWidth],
  );

  // Handle problem statement / file tree split resize
  const handleProblemStatementResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = problemStatementHeight;
      const container = containerRef.current;
      if (!container) return;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const delta = moveEvent.clientY - startY;
        const newHeight = startHeight + (delta / rect.height) * 100;
        setProblemStatementHeight(Math.max(20, Math.min(80, newHeight)));
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [problemStatementHeight],
  );

  // Handle preview / console split resize
  const handleRightPanelSplitResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startRatio = rightPanelSplitRatio;
      const container = containerRef.current;
      if (!container) return;

      const rightPanel = container.querySelector("[data-right-panel]") as HTMLElement;
      if (!rightPanel) return;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const rect = rightPanel.getBoundingClientRect();
        const delta = moveEvent.clientY - startY;
        const newRatio = startRatio + delta / rect.height;
        setRightPanelSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [rightPanelSplitRatio],
  );

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
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header - Reduced height by 60% */}
      <div className="border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Shared coding workspace</p>
            <h1 className="truncate text-xl font-semibold text-white">{challenge.session.title || challenge.jobDescription.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{WORKSPACE_TEMPLATE_LABELS[challenge.session.workspaceTemplate]}</Badge>
            {challenge.session.timeLimitMinutes ? <Badge variant="default">{challenge.session.timeLimitMinutes} min</Badge> : null}
            <Badge variant={connected ? "success" : "default"}>{connected ? "Connected" : "Offline"}</Badge>
            <Badge variant="default">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Idle"}</Badge>
            <select
              title="Runtime language"
              name="runtimeLanguage"
              value={runtimeLanguage}
              onChange={(event) => {
                const nextLanguage = event.target.value;
                setRuntimeLanguage(nextLanguage);
                persistWorkspace(workspace, nextLanguage);
              }}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1 text-sm text-slate-100"
            >
              {challenge.session.languages.map((lang) => (
                <option key={lang} value={lang.toLowerCase()}>
                  {lang}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={SANDPACK_LANGS.has(runtimeLanguage) ? handleRun : handleServerRun} loading={serverRunning}>
              {SANDPACK_LANGS.has(runtimeLanguage) ? "Run" : serverRunning ? "Running…" : "▶ Run"}
            </Button>
            <Button size="sm" onClick={handleSubmit} loading={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main layout - 3 columns with resizable separators */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Left Panel */}
        <div className="flex flex-col border-r border-white/10 bg-slate-900/50 overflow-hidden" style={{ width: `${leftPanelWidth}px` }}>
          {/* Problem Statement Section */}
          <div className="flex-shrink-0 overflow-hidden border-b border-white/10 p-4" style={{ height: `${problemStatementHeight}%` }}>
            <h2 className="mb-3 text-base font-semibold text-white">Problem</h2>
            <div className="overflow-y-auto h-full pr-2">
              <p className="text-xs leading-5 text-slate-300 whitespace-pre-wrap">{challenge.session.problemStatement || challenge.jobDescription.description}</p>
              {challenge.session.useCase ? (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-slate-200">Use case</h3>
                  <p className="mt-2 text-xs leading-4 text-slate-400 whitespace-pre-wrap">{challenge.session.useCase}</p>
                </div>
              ) : null}
              {challenge.session.requirements?.length ? (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-slate-200">Requirements</h3>
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {challenge.session.requirements.map((requirement) => (
                      <li key={requirement} className="list-disc list-inside">
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          {/* Resize separator */}
          <ResizablePanelSeparator onDragStart={handleProblemStatementResize} direction="horizontal" />

          {/* File Tree Section */}
          <div className="flex-1 overflow-hidden flex flex-col border-b border-white/10 p-4">
            <div className="mb-3 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-white">Files</h2>
              <button onClick={() => setShowNewFileInput(!showNewFileInput)} className="text-xs text-cyan-400 hover:text-cyan-300">
                + Add
              </button>
            </div>
            {showNewFileInput && (
              <div className="mb-3 flex gap-2 flex-shrink-0">
                <Input
                  placeholder="filename.tsx"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNewFile()}
                  className="!py-1 !text-xs !bg-slate-800 !border-slate-700"
                />
                <Button size="sm" onClick={handleAddNewFile} className="!py-1 !text-xs">
                  Create
                </Button>
              </div>
            )}
            <div className="overflow-y-auto space-y-1 flex-1">
              {workspace.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setWorkspace({ ...workspace, activePath: file.path })}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors ${file.path === workspace.activePath ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:bg-white/5"}`}
                >
                  <span className="truncate">{file.path.split("/").pop()}</span>
                  <span className="ml-2 text-[9px] uppercase tracking-[0.1em] text-slate-600 flex-shrink-0">{file.language}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Left resize separator */}
        <ResizablePanelSeparator onDragStart={handleLeftPanelResize} direction="vertical" />
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900/50 border-r border-white/10">
          <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 px-4 py-2">
            <div>
              <p className="text-sm font-medium text-white">{activeFile.path}</p>
              <p className="text-xs text-slate-500">Edit and watch preview update in real-time</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <MonacoEditor
              key={activeFile.path}
              height="100%"
              language={activeFile.language === "jsx" || activeFile.language === "tsx" ? "typescript" : activeFile.language}
              defaultValue={activeFile.code}
              onChange={handleCodeChange}
              theme="vs-dark"
              beforeMount={(monaco) => {
                try {
                  if (monaco?.languages?.typescript?.typescriptDefaults) {
                    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                      noSemanticValidation: true,
                      noSyntaxValidation: false,
                    });
                    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                      noSemanticValidation: true,
                      noSyntaxValidation: false,
                    });
                    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                      allowNonTsExtensions: true,
                      jsx: monaco.languages.typescript.JsxEmit.React,
                      jsxFactory: "React.createElement",
                      target: monaco.languages.typescript.ScriptTarget.ES2020,
                    });
                    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                      allowNonTsExtensions: true,
                      checkJs: false,
                    });
                  }

                  // Register basic snippet completions for server-side languages
                  const registerSnippets = (langId: string, items: { label: string; insertText: string; doc: string }[]) => {
                    monaco.languages.registerCompletionItemProvider(langId, {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      provideCompletionItems: (model: any, position: any) => {
                        const word = model.getWordUntilPosition(position);
                        const range = {
                          startLineNumber: position.lineNumber,
                          endLineNumber: position.lineNumber,
                          startColumn: word.startColumn,
                          endColumn: word.endColumn,
                        };
                        return {
                          suggestions: items.map((item) => ({
                            label: item.label,
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            documentation: item.doc,
                            insertText: item.insertText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range,
                          })),
                        };
                      },
                    });
                  };

                  registerSnippets("python", [
                    { label: "def", insertText: "def ${1:function_name}(${2:params}):\n\t${3:pass}", doc: "Define a function" },
                    { label: "class", insertText: "class ${1:ClassName}:\n\tdef __init__(self):\n\t\t${2:pass}", doc: "Define a class" },
                    { label: "for", insertText: "for ${1:item} in ${2:iterable}:\n\t${3:pass}", doc: "For loop" },
                    { label: "print", insertText: "print(${1:value})", doc: "Print to stdout" },
                    { label: "list comp", insertText: "[${1:expr} for ${2:item} in ${3:iterable}]", doc: "List comprehension" },
                  ]);
                  registerSnippets("go", [
                    { label: "func", insertText: "func ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}", doc: "Define a function" },
                    { label: "fmt.Println", insertText: 'fmt.Println(${1:"hello"})', doc: "Print line" },
                    { label: "for", insertText: "for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t${3}\n}", doc: "For loop" },
                    { label: "if err", insertText: "if err != nil {\n\treturn ${1:err}\n}", doc: "Error check" },
                    { label: "goroutine", insertText: "go func() {\n\t${1}\n}()", doc: "Goroutine" },
                  ]);
                  registerSnippets("java", [
                    { label: "main", insertText: "public static void main(String[] args) {\n\t${1}\n}", doc: "Main method" },
                    { label: "sout", insertText: 'System.out.println(${1:"Hello"});', doc: "Print to stdout" },
                    { label: "class", insertText: "public class ${1:ClassName} {\n\t${2}\n}", doc: "Class definition" },
                    { label: "for", insertText: "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}", doc: "For loop" },
                  ]);
                  registerSnippets("rust", [
                    { label: "fn", insertText: "fn ${1:name}(${2:params}) -> ${3:()} {\n\t${4}\n}", doc: "Define a function" },
                    { label: "println!", insertText: 'println!("${1:{}}", ${2:value});', doc: "Print macro" },
                    { label: "match", insertText: "match ${1:value} {\n\t${2:pattern} => ${3:expr},\n\t_ => ${4:expr},\n}", doc: "Match expression" },
                    { label: "impl", insertText: "impl ${1:Type} {\n\t${2}\n}", doc: "Implement methods" },
                  ]);
                  registerSnippets("cpp", [
                    { label: "cout", insertText: 'std::cout << ${1:"Hello"} << std::endl;', doc: "Print to stdout" },
                    { label: "for", insertText: "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}", doc: "For loop" },
                    { label: "class", insertText: "class ${1:ClassName} {\npublic:\n\t${2}\n};", doc: "Class definition" },
                    { label: "#include", insertText: "#include <${1:iostream}>", doc: "Include header" },
                  ]);
                } catch {
                  // ignore — non-critical enhancement
                }
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                // Keep reference to editor to avoid resetting value which can move cursor
                // Ensure the editor doesn't re-render the value unless the file actually changes
                editor.updateOptions({ automaticLayout: true, smoothScrolling: true, cursorBlinking: "blink" });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                padding: { top: 12, bottom: 12 },
                automaticLayout: true,
                smoothScrolling: true,
                renderValidationDecorations: "on",
              }}
            />
          </div>
        </div>

        {/* Right resize separator */}
        <ResizablePanelSeparator onDragStart={handleRightPanelResize} direction="vertical" />

        {/* Right Panel */}
        <div className="flex flex-col border-l border-white/10 bg-slate-900/50 overflow-hidden" style={{ width: `${rightPanelWidth}px` }} ref={rightPanelRef} data-right-panel>
          {SANDPACK_LANGS.has(runtimeLanguage) ? (
            <>
              {/* Sandpack Preview + Console for browser languages */}
              <div className="flex flex-col min-h-0 overflow-hidden w-full" style={{ flex: `${rightPanelSplitRatio}` }}>
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
                  <SandpackLayout className="!h-full !w-full !rounded-none !border-0 !bg-transparent">
                    <div className="flex flex-col w-full h-full bg-white">
                      <div className="flex-shrink-0 border-b border-slate-200 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-900">Preview</p>
                      </div>
                      <div className="flex-1 w-full min-h-0 overflow-auto">
                        <SandpackPreview className="!h-full !w-full" />
                      </div>
                    </div>
                  </SandpackLayout>
                </SandpackProvider>
              </div>

              <ResizablePanelSeparator onDragStart={handleRightPanelSplitResize} direction="horizontal" />

              <div className="flex flex-col min-h-0" style={{ flex: `${1 - rightPanelSplitRatio}` }}>
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
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/80 border-t border-white/10">
                      <div className="flex-shrink-0 border-b border-white/10 px-3 py-2">
                        <p className="text-xs font-semibold text-white">Console</p>
                      </div>
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <SandpackConsole className="!h-full !bg-slate-900 !text-slate-100 text-xs" />
                      </div>
                    </div>
                  </SandpackLayout>
                </SandpackProvider>
              </div>
            </>
          ) : (
            /* Server-side execution output panel */
            <div className="flex flex-col h-full bg-slate-950 font-mono">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 flex-shrink-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output — {runtimeLanguage}</p>
                {execOutput && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${execOutput.exitCode === 0 ? "bg-emerald-900/60 text-emerald-300" : "bg-rose-900/60 text-rose-300"}`}>
                    exit {execOutput.exitCode}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                {!execOutput && !serverRunning && <p className="text-slate-600 italic">Press ▶ Run to execute your code</p>}
                {serverRunning && <p className="text-slate-400 animate-pulse">Running…</p>}
                {execOutput && (
                  <>
                    {execOutput.compile?.exitCode !== 0 && execOutput.compile?.stderr && (
                      <div>
                        <p className="text-rose-400 font-semibold mb-1">Compile error</p>
                        <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed">{execOutput.compile.stderr}</pre>
                      </div>
                    )}
                    {execOutput.stdout && <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed">{execOutput.stdout}</pre>}
                    {execOutput.stderr && <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed">{execOutput.stderr}</pre>}
                    {!execOutput.stdout && !execOutput.stderr && !(execOutput.compile?.exitCode !== 0) && <p className="text-slate-500 italic">(no output)</p>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer messages */}
      {error ? <div className="border-t border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">{error}</div> : null}
      {success ? <div className="border-t border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">{success}</div> : null}
    </div>
  );
}
