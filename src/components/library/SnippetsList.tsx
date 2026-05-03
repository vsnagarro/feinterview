"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "@/types/app";
import type { Database } from "@/types/database";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Snippet = Database["public"]["Tables"]["code_snippets"]["Row"];

interface SnippetsListProps {
  initialSnippets: Snippet[];
}

export function SnippetsList({ initialSnippets }: SnippetsListProps) {
  const [snippets, setSnippets] = useState(initialSnippets);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    title: "",
    description: "",
    language: "javascript",
    code: "// Write your code here\n",
    explanation: "",
    difficulty: "mid" as Snippet["difficulty"],
    tags: "",
  });

  const languages = Array.from(new Set(snippets.map((s) => s.language).filter((l): l is string => !!l)));

  const filtered = snippets
    .filter(
      (s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.language.toLowerCase().includes(search.toLowerCase()) || s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
    )
    .filter((s) => !languageFilter || s.language === languageFilter)
    .filter((s) => !difficultyFilter || s.difficulty === difficultyFilter)
    .sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let aVal: any = a[sortBy as keyof Snippet];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let bVal: any = b[sortBy as keyof Snippet];
      if (sortBy === "title") {
        aVal = (aVal as string)?.toLowerCase() || "";
        bVal = (bVal as string)?.toLowerCase() || "";
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/save-snippet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          code: form.code,
          language: form.language,
          explanation: form.explanation || "",
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          difficulty: form.difficulty,
        }),
      });
      const result = await response.json();
      setSaving(false);
      if (!response.ok) {
        toast(result.error || "Failed to add snippet", "error");
      } else {
        setSnippets((prev) => [result.snippet, ...prev]);
        setForm({ title: "", description: "", language: "javascript", code: "// Write your code here\n", explanation: "", difficulty: "mid", tags: "" });
        setShowAdd(false);
        toast("Snippet saved", "success");
      }
    } catch {
      setSaving(false);
      toast("Error saving snippet", "error");
    }
  }

  async function handleDeleteSnippet(snippetId: string) {
    if (!confirm("Are you sure you want to delete this snippet?")) return;

    try {
      const response = await fetch(`/api/code-snippets/${snippetId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      setSnippets((prev) => prev.filter((s) => s.id !== snippetId));
      toast("Snippet deleted", "success");
    } catch {
      toast("Error deleting snippet", "error");
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} snippet(s)?`)) return;

    setDeleting(true);
    let deleted = 0;
    for (const id of selectedIds) {
      try {
        const response = await fetch(`/api/code-snippets/${id}`, { method: "DELETE" });
        if (response.ok) deleted++;
      } catch {
        // Continue with next
      }
    }
    setDeleting(false);
    setSnippets((prev) => prev.filter((s) => !selectedIds.has(s.id)));
    setSelectedIds(new Set());
    toast(`Deleted ${deleted} snippet(s)`, "success");
  }

  return (
    <div>
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3">
          <Input placeholder="Search snippets, languages, tags…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <span className="text-sm text-slate-400 ml-auto">{filtered.length} snippets</span>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-slate-400">{selectedIds.size} selected</span>
              <Button size="sm" variant="danger" loading={deleting} onClick={handleDeleteSelected}>
                🗑️ Delete selected
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancel" : "+ Add snippet"}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 font-medium">Filter & Sort:</span>
          <Select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            options={[{ value: "", label: "All Languages" }, ...languages.map((l) => ({ value: l, label: LANGUAGE_LABELS[l as keyof typeof LANGUAGE_LABELS] || l }))]}
            className="w-32"
          />
          <Select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            options={[
              { value: "", label: "All Difficulties" },
              { value: "junior", label: "Junior" },
              { value: "mid", label: "Mid" },
              { value: "senior", label: "Senior" },
            ]}
            className="w-32"
          />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: "created_at", label: "Recently Added" },
              { value: "title", label: "Title" },
              { value: "language", label: "Language" },
              { value: "difficulty", label: "Difficulty" },
            ]}
            className="w-36"
          />
          <Button size="sm" variant={sortOrder === "asc" ? "primary" : "secondary"} onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="px-2">
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card p-5 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Debounce implementation" required />
            <Select
              label="Language"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }))}
            />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What does this snippet demonstrate?" />
          <div>
            <label className="label mb-1 block">Code</label>
            <div className="border border-slate-300 rounded-lg overflow-hidden h-48">
              <MonacoEditor
                language={form.language}
                value={form.code}
                onChange={(v) => setForm({ ...form, code: v ?? "" })}
                options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 13 }}
                theme="vs-light"
              />
            </div>
          </div>
          <Textarea
            label="Explanation"
            value={form.explanation}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            rows={3}
            placeholder="What does this code demonstrate and why does it matter?"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Difficulty"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as Snippet["difficulty"] })}
              options={[
                { value: "junior", label: "Junior" },
                { value: "mid", label: "Mid" },
                { value: "senior", label: "Senior" },
              ]}
            />
            <Input label="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="closures, async, performance" />
          </div>
          <Button type="submit" loading={saving}>
            Save snippet
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="card overflow-hidden">
            <div className="w-full p-4 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="flex items-start gap-3 flex-1">
                <input
                  title="Select snippet"
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={(e) => {
                    const newSet = new Set(selectedIds);
                    if (e.target.checked) {
                      newSet.add(s.id);
                    } else {
                      newSet.delete(s.id);
                    }
                    setSelectedIds(newSet);
                  }}
                  className="mt-1"
                />
                <button className="text-left flex-1" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <p className="text-sm font-medium text-slate-900">{s.title}</p>
                  {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="info">{s.language}</Badge>
                <Badge variant={s.difficulty === "senior" ? "danger" : s.difficulty === "junior" ? "success" : "warning"}>{s.difficulty}</Badge>
                <button onClick={() => handleDeleteSnippet(s.id)} className="text-slate-400 hover:text-red-500 text-xs">
                  🗑️
                </button>
              </div>
            </div>
            {expanded === s.id && (
              <div className="border-t border-slate-100">
                <div className="h-48">
                  <MonacoEditor language={s.language} value={s.code} options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 13 }} theme="vs-light" />
                </div>
                {s.explanation && <div className="px-4 py-3 text-sm text-slate-600 bg-slate-50">{s.explanation}</div>}
                {s.tags.length > 0 && (
                  <div className="px-4 pb-3 flex gap-1 flex-wrap">
                    {s.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">{search ? "No matching snippets" : "No snippets yet"}</div>}
      </div>
    </div>
  );
}
