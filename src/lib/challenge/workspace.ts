import type { WorkspaceTemplate } from "@/types/app";

export interface WorkspaceFile {
  path: string;
  language: string;
  code: string;
}

export interface WorkspaceState {
  template: WorkspaceTemplate;
  activePath: string;
  files: WorkspaceFile[];
}

export interface SandpackRuntimeConfig {
  template: "react-ts" | "static";
  files: Record<string, { code: string; active?: boolean }>;
  activeFile: string;
  visibleFiles: string[];
  customSetup?: {
    entry?: string;
    dependencies?: Record<string, string>;
  };
  externalResources?: string[];
}

function mergeSandboxDependencies(dependencies?: Record<string, string>) {
  if (!dependencies || Object.keys(dependencies).length === 0) {
    return undefined;
  }

  return Object.fromEntries(Object.entries(dependencies).filter(([name, version]) => !!name && !!version));
}

function looksLikeReactCode(code?: string | null) {
  if (!code) return false;
  return /useState|useEffect|useMemo|useCallback|jsx|tsx|React\.|export default function App|return \(/.test(code);
}

function looksLikeHtml(code?: string | null) {
  if (!code) return false;
  return /<html|<body|<div|<!doctype html/i.test(code);
}

function looksLikeTailwind(code?: string | null) {
  if (!code) return false;
  return /class(Name)?=\"[^\"]*(bg-|text-|flex|grid|px-|py-|rounded|shadow)/.test(code);
}

function buildReactFiles(starterCode?: string | null) {
  const starter = starterCode?.trim();
  const isHookOrModule = !!starter && /(function use[A-Z]|const use[A-Z]|export function use[A-Z]|interface\s+[A-Z]|type\s+[A-Z])/.test(starter);
  const isComponent = !!starter && !isHookOrModule && /(export default function App|return\s*\(<|<[a-z][^>]*>|React\.createElement)/.test(starter);

  if (starter && !isComponent) {
    return {
      activePath: "src/useSolution.ts",
      files: [
        {
          path: "src/useSolution.ts",
          language: "typescript",
          code: starter,
        },
        {
          path: "src/App.tsx",
          language: "typescript",
          code: `export default function App() {
  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">Preview harness</p>
        <h1>Wire your hook or utility into this demo view</h1>
        <p>Edit <code>src/useSolution.ts</code>, then connect it to this component to validate behavior in the preview.</p>
      </section>
    </main>
  );
}
`,
        },
        {
          path: "src/styles.css",
          language: "css",
          code: `.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #f8fafc, #e2e8f0);
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.card {
  width: min(680px, calc(100vw - 48px));
  padding: 32px;
  border-radius: 24px;
  background: white;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
}

pre {
  margin-top: 16px;
  padding: 16px;
  border-radius: 16px;
  background: #0f172a;
  color: #e2e8f0;
  overflow: auto;
}
`,
        },
        {
          path: "public/index.html",
          language: "html",
          code: `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
        },
      ],
    };
  }

  return {
    activePath: "src/App.tsx",
    files: [
      {
        path: "src/App.tsx",
        language: "typescript",
        code:
          starter ||
          `export default function App() {
  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">Frontend interview</p>
        <h1>Build the requested UI here</h1>
        <p>Use the problem statement and requirements panel to guide your solution.</p>
      </section>
    </main>
  );
}
`,
      },
      {
        path: "src/styles.css",
        language: "css",
        code: `.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #f8fafc, #e2e8f0);
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.card {
  width: min(560px, calc(100vw - 48px));
  padding: 32px;
  border-radius: 24px;
  background: white;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
}
`,
      },
      {
        path: "public/index.html",
        language: "html",
        code: `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
      },
    ],
  };
}

export function inferWorkspaceTemplate(template: WorkspaceTemplate | null | undefined, starterCode?: string | null) {
  if (template && template !== "vanilla") return template;
  if (looksLikeTailwind(starterCode) && looksLikeHtml(starterCode)) return "tailwind";
  if (looksLikeReactCode(starterCode)) return "react";
  if (looksLikeHtml(starterCode)) return "vanilla";
  return template || "vanilla";
}

function languageFromPath(path: string) {
  if (path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

function replaceFile(files: WorkspaceFile[], path: string, code: string) {
  return files.map((file) => (file.path === path ? { ...file, code } : file));
}

function getFile(files: WorkspaceFile[], path: string) {
  return files.find((file) => file.path === path)?.code ?? "";
}

function normalizeStaticHtml(code: string) {
  return (
    code
      // Normalise script src to ./index.js regardless of whether ./ prefix is present
      .replace(/src="(?:\.\/)?main\.js"/g, 'src="./index.js"')
      .replace(/src="(?:\.\/)?script\.js"/g, 'src="./index.js"')
      .replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*/g, "")
  );
}

function sanitizeTypeScriptModule(code: string) {
  return code
    .replace(/^import[^;]+;\s*/gm, "")
    .replace(/interface\s+\w+\s*{[\s\S]*?}\s*/g, "")
    .replace(/type\s+\w+\s*=\s*[^;]+;\s*/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\sas\s+[A-Za-z0-9_<>, |]+/g, "")
    .replace(/:\s*[A-Za-z0-9_<>, |\[\]\?]+(?=\s*[=),{])/g, "");
}

function sanitizeComponentCode(code: string) {
  return code
    .replace(/\sas\s+[A-Za-z0-9_<>, |]+/g, "")
    .replace(/export default function App/, "function App")
    .replace(/export default App;?/g, "");
}

export function createWorkspace(template: WorkspaceTemplate, starterCode?: string | null): WorkspaceState {
  if (template === "react") {
    const reactWorkspace = buildReactFiles(starterCode);
    return {
      template,
      activePath: reactWorkspace.activePath,
      files: reactWorkspace.files,
    };
  }

  if (template === "tailwind") {
    return {
      template,
      activePath: "index.html",
      files: [
        {
          path: "index.html",
          language: "html",
          code:
            starterCode?.trim() ||
            `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="min-h-screen bg-slate-950 text-slate-50">
    <main class="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
      <section class="w-full rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur">
        <p class="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Challenge workspace</p>
        <h1 class="text-4xl font-bold">Build the requested component here</h1>
        <p class="mt-4 text-slate-300">Tailwind utilities are available in this preview.</p>
      </section>
    </main>
    <script src="./main.js"></script>
  </body>
</html>`,
        },
        {
          path: "main.js",
          language: "javascript",
          code: `console.log("Workspace ready");`,
        },
      ],
    };
  }

  return {
    template: "vanilla",
    activePath: "index.html",
    files: [
      {
        path: "index.html",
        language: "html",
        code:
          starterCode?.trim() ||
          `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Challenge Preview</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div id="app">
      <h1>Implement the task here</h1>
      <p>Use the preview and console to validate your solution.</p>
    </div>
    <script src="./script.js"></script>
  </body>
</html>`,
      },
      {
        path: "styles.css",
        language: "css",
        code: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f8fafc;
  color: #0f172a;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

#app {
  width: min(560px, calc(100vw - 48px));
  padding: 32px;
  border-radius: 24px;
  background: white;
  box-shadow: 0 16px 50px rgba(15, 23, 42, 0.1);
}
`,
      },
      {
        path: "script.js",
        language: "javascript",
        code: `console.log("Workspace ready");`,
      },
    ],
  };
}

export function deserializeWorkspace(raw: string | null | undefined, fallbackTemplate: WorkspaceTemplate, starterCode?: string | null) {
  if (!raw) return createWorkspace(fallbackTemplate, starterCode);

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    if (parsed && Array.isArray(parsed.files) && typeof parsed.activePath === "string") {
      return {
        template: (parsed.template as WorkspaceTemplate) || fallbackTemplate,
        activePath: parsed.activePath,
        files: parsed.files.map((file) => ({
          path: file.path,
          language: file.language || languageFromPath(file.path),
          code: file.code || "",
        })),
      };
    }
  } catch {
    return {
      ...createWorkspace(fallbackTemplate, starterCode),
      files: replaceFile(createWorkspace(fallbackTemplate, starterCode).files, createWorkspace(fallbackTemplate, starterCode).activePath, raw),
    };
  }

  return createWorkspace(fallbackTemplate, starterCode);
}

export function serializeWorkspace(workspace: WorkspaceState) {
  return JSON.stringify(workspace);
}

export function flattenWorkspaceForSubmission(workspace: WorkspaceState) {
  return workspace.files.map((file) => `// ${file.path}\n${file.code}`).join("\n\n");
}

export function updateWorkspaceFile(workspace: WorkspaceState, path: string, code: string): WorkspaceState {
  return {
    ...workspace,
    files: replaceFile(workspace.files, path, code),
  };
}

export function toSandpackRuntime(workspace: WorkspaceState, sandboxDependencies?: Record<string, string>): SandpackRuntimeConfig {
  const customDependencies = mergeSandboxDependencies(sandboxDependencies);

  if (workspace.template === "react") {
    const files: SandpackRuntimeConfig["files"] = {
      "/App.tsx": {
        code: getFile(workspace.files, "src/App.tsx") || createWorkspace("react").files.find((file) => file.path === "src/App.tsx")?.code || "",
        active: workspace.activePath === "src/App.tsx",
      },
      "/styles.css": {
        code: getFile(workspace.files, "src/styles.css"),
        active: workspace.activePath === "src/styles.css",
      },
      "/index.tsx": {
        code: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
      },
    };

    const hookModule = getFile(workspace.files, "src/useSolution.ts");
    if (hookModule) {
      files["/useSolution.ts"] = {
        code: hookModule,
        active: workspace.activePath === "src/useSolution.ts",
      };
    }

    const visibleFiles = Object.keys(files).filter((path) => path !== "/index.tsx");
    const activeFile = workspace.activePath === "src/useSolution.ts" && files["/useSolution.ts"] ? "/useSolution.ts" : workspace.activePath === "src/styles.css" ? "/styles.css" : "/App.tsx";

    return {
      template: "react-ts",
      files,
      activeFile,
      visibleFiles,
      customSetup: {
        entry: "/index.tsx",
        dependencies: customDependencies,
      },
    };
  }

  const scriptPath = workspace.template === "tailwind" ? "main.js" : "script.js";
  const files: SandpackRuntimeConfig["files"] = {
    "/index.html": {
      code: normalizeStaticHtml(getFile(workspace.files, "index.html")),
      active: workspace.activePath === "index.html",
    },
    "/index.js": {
      code: getFile(workspace.files, scriptPath),
      active: workspace.activePath === scriptPath,
    },
  };

  const styles = getFile(workspace.files, "styles.css");
  if (styles) {
    files["/styles.css"] = {
      code: styles,
      active: workspace.activePath === "styles.css",
    };
  }

  return {
    template: "static",
    files,
    activeFile: workspace.activePath === scriptPath ? "/index.js" : workspace.activePath === "styles.css" ? "/styles.css" : "/index.html",
    visibleFiles: Object.keys(files),
    customSetup: customDependencies ? { dependencies: customDependencies } : undefined,
    externalResources: workspace.template === "tailwind" ? ["https://cdn.tailwindcss.com"] : undefined,
  };
}

export function buildPreviewDocument(workspace: WorkspaceState, runId: number) {
  const baseConsoleBridge = `
<script>
  const runId = ${runId};
  const post = (level, args) => parent.postMessage({ source: 'challenge-preview', runId, level, args }, '*');
  ['log', 'warn', 'error', 'info'].forEach((level) => {
    const original = console[level];
    console[level] = (...args) => {
      post(level, args.map((arg) => typeof arg === 'string' ? arg : JSON.stringify(arg)));
      original.apply(console, args);
    };
  });
  window.addEventListener('error', (event) => post('error', [event.message]));
</script>`;

  if (workspace.template === "react") {
    const html = getFile(workspace.files, "public/index.html");
    const app = sanitizeComponentCode(getFile(workspace.files, "src/App.tsx"));
    const helperModule = sanitizeTypeScriptModule(
      getFile(workspace.files, "src/useSolution.ts")
        .replace(/export function /g, "function ")
        .replace(/export const /g, "const ")
        .replace(/export default /g, "const useSolution = "),
    );
    const styles = getFile(workspace.files, "src/styles.css");
    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${styles}</style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  </head>
  <body>
    ${html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || '<div id="root"></div>'}
    ${baseConsoleBridge}
    <script type="text/babel" data-presets="typescript,react">
      ${helperModule}
      ${app}
      const mountNode = document.getElementById('root');
      const AppComponent = typeof App === 'function' ? App : null;
      if (!AppComponent) {
        throw new Error('Expected src/App.tsx to export a React component named App or default export.');
      }
      ReactDOM.createRoot(mountNode).render(React.createElement(AppComponent));
    </script>
  </body>
</html>`;
  }

  const html = getFile(workspace.files, "index.html");
  const css = getFile(workspace.files, "styles.css");
  const js = getFile(workspace.files, workspace.template === "tailwind" ? "main.js" : "script.js");
  const doc = html || '<div id="app"></div>';
  const withStyles = doc.includes("</head>") ? doc.replace("</head>", `<style>${css}</style></head>`) : `<style>${css}</style>${doc}`;
  const withScript = withStyles.includes("</body>") ? withStyles.replace("</body>", `${baseConsoleBridge}<script>${js}</script></body>`) : `${withStyles}${baseConsoleBridge}<script>${js}</script>`;

  return withScript;
}
