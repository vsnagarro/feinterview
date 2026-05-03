"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { LanguageSelector } from "./LanguageSelector";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { useCodeSync } from "@/lib/realtime/useCodeSync";
import { createClient } from "@/lib/supabase/client";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Languages that run in-browser via the parent Sandpack provider — no server execution needed
const BROWSER_LANGS = new Set(["javascript", "typescript", "html", "css"]);

interface OutputResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  compile?: { stderr: string; exitCode: number } | null;
}

interface CandidateEditorProps {
  linkId: string;
  starterCode: string | null;
  supportedLanguages: string[];
}

export function CandidateEditor({ linkId, starterCode, supportedLanguages }: CandidateEditorProps) {
  const firstLang = supportedLanguages[0] ?? "javascript";
  const [language, setLanguage] = useState(firstLang);
  const [code, setCode] = useState(starterCode ?? "// Write your solution here\n");
  const [connected, setConnected] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<OutputResult | null>(null);
  const [outputHeight, setOutputHeight] = useState(200);
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { syncCode } = useCodeSync({
    linkId,
    onConnected: () => setConnected(true),
    // When a realtime update arrives, apply it via executeEdits to preserve cursor position
    onCodeUpdate: (remoteCode: string, remoteLang: string) => {
      setLanguage(remoteLang);
      const ed = editorRef.current;
      if (!ed) {
        setCode(remoteCode);
        return;
      }
      const model = ed.getModel();
      if (!model) return;
      const current = model.getValue();
      if (current === remoteCode) return; // no-op — avoids cursor jump
      const fullRange = model.getFullModelRange();
      ed.executeEdits("remote-sync", [{ range: fullRange, text: remoteCode, forceMoveMarkers: false }]);
    },
  });

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value ?? "";
      setCode(newCode);
      syncCode(newCode, language);
    },
    [syncCode, language],
  );

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      syncCode(code, lang);
      setOutput(null); // clear stale output when switching language
    },
    [code, syncCode],
  );

  const handleRun = useCallback(async () => {
    if (running) return;
    if (BROWSER_LANGS.has(language.toLowerCase())) {
      toast("Use the sandbox preview/console below for browser languages", "info");
      return;
    }
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Execution failed", "error");
        return;
      }
      setOutput({
        stdout: data.stdout ?? "",
        stderr: data.stderr ?? "",
        exitCode: data.exitCode ?? null,
        compile: data.compile ?? null,
      });
    } catch {
      toast("Could not reach execution service", "error");
    } finally {
      setRunning(false);
    }
  }, [running, language, code]);

  const handleOutputResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = outputHeight;
      const move = (mv: MouseEvent) => {
        const delta = startY - mv.clientY; // drag up = enlarge
        setOutputHeight(Math.max(80, Math.min(500, startH + delta)));
      };
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    },
    [outputHeight],
  );

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("challenge_submissions").insert({
      link_id: linkId,
      language,
      code,
      is_snapshot: false,
    });
    setSubmitting(false);
    if (error) {
      toast("Failed to submit. Please try again.", "error");
    } else {
      setSubmitted(true);
      toast("Code submitted successfully!", "success");
    }
  }

  const isBrowserLang = BROWSER_LANGS.has(language.toLowerCase());
  const hasOutput = output !== null;
  const compileError = output?.compile?.exitCode !== 0 ? output?.compile?.stderr : null;

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <LanguageSelector supportedLanguages={supportedLanguages} value={language} onChange={handleLanguageChange} />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-500"}`} />
            <span className="text-xs text-slate-400">{connected ? "Live" : "Connecting…"}</span>
          </div>
          {!isBrowserLang && (
            <Button size="sm" variant="secondary" loading={running} onClick={handleRun} title={`Run ${language} code on server`}>
              ▶ Run
            </Button>
          )}
          {submitted ? (
            <Badge variant="success">Submitted</Badge>
          ) : (
            <Button size="sm" onClick={handleSubmit} loading={submitting} disabled={!connected}>
              Submit
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={language === "typescript" ? "typescript" : language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          beforeMount={(monaco) => {
            // JS/TS: keep syntax validation, disable semantic to avoid false positives
            if (monaco?.languages?.typescript?.javascriptDefaults) {
              monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: false,
              });
              monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: false,
              });
              monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                allowNonTsExtensions: true,
                checkJs: false,
              });
            }
          }}
          onMount={(editor) => {
            editorRef.current = editor;
            editor.updateOptions({
              automaticLayout: true,
              smoothScrolling: true,
              cursorBlinking: "blink",
            });
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: { other: true, comments: false, strings: false },
            parameterHints: { enabled: true },
            formatOnType: true,
          }}
        />
      </div>

      {/* Output panel — only for server-executed languages */}
      {!isBrowserLang && (
        <>
          {/* Drag handle */}
          <div onMouseDown={handleOutputResize} className="flex-shrink-0 h-1 bg-slate-700 hover:bg-cyan-500/60 cursor-row-resize transition-colors" />

          <div className="flex-shrink-0 flex flex-col bg-slate-950 border-t border-slate-700 font-mono overflow-hidden" style={{ height: `${outputHeight}px` }}>
            {/* Output header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 flex-shrink-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output</p>
              {hasOutput && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${output.exitCode === 0 ? "bg-emerald-900/60 text-emerald-300" : "bg-rose-900/60 text-rose-300"}`}>
                  exit {output.exitCode}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {!hasOutput && !running && <p className="text-slate-600 italic">Press ▶ Run to execute your code</p>}
              {running && <p className="text-slate-400 animate-pulse">Running…</p>}
              {hasOutput && (
                <>
                  {/* Compile errors (Java, C++, Rust, TS) */}
                  {compileError && (
                    <div>
                      <p className="text-xs text-rose-400 font-semibold mb-1">Compile error</p>
                      <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed">{compileError}</pre>
                    </div>
                  )}

                  {/* stdout */}
                  {output.stdout && <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed">{output.stdout}</pre>}

                  {/* stderr (runtime) */}
                  {output.stderr && <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed">{output.stderr}</pre>}

                  {/* Empty output */}
                  {!output.stdout && !output.stderr && !compileError && <p className="text-slate-500 italic">(no output)</p>}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
