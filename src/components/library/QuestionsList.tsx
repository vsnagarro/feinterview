"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Question = Database["public"]["Tables"]["questions"]["Row"];

interface QuestionsListProps {
  initialQuestions: Question[];
}

const levelVariant = {
  junior: "success",
  mid: "warning",
  senior: "danger",
} as const;

export function QuestionsList({ initialQuestions }: QuestionsListProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [augmenting, setAugmenting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    text: "",
    answer: "",
    category: "",
    level: "mid" as Question["level"],
    tags: "",
  });

  async function handleAugmentQuestion(questionId: string) {
    setAugmenting(true);
    try {
      const response = await fetch("/api/questions/augment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [questionId] }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast(result.error || "Failed to augment question", "error");
      } else {
        // Update the question in the local state
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  simple_explanation: result.results[0]?.data?.simple_explanation,
                  examples: result.results[0]?.data?.examples,
                  code_examples: result.results[0]?.data?.code_examples,
                }
              : q,
          ),
        );
        toast("Question augmented with AI-generated explanations and examples", "success");
      }
    } catch {
      toast("Error augmenting question", "error");
    } finally {
      setAugmenting(false);
    }
  }

  async function handleAugmentAll() {
    setAugmenting(true);
    try {
      const questionIds = filtered.map((q) => q.id);
      const response = await fetch("/api/questions/augment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast(result.error || "Failed to augment questions", "error");
      } else {
        // Reload questions from the API
        const allResponse = await fetch("/api/questions");
        const allQuestions = await allResponse.json();
        setQuestions(allQuestions);
        toast(`${result.augmented} of ${result.total} questions augmented successfully`, "success");
      }
    } catch {
      toast("Error augmenting questions", "error");
    } finally {
      setAugmenting(false);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const response = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toast("Question deleted", "success");
    } catch {
      toast("Error deleting question", "error");
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} question(s)?`)) return;

    setDeleting(true);
    let deleted = 0;
    for (const id of selectedIds) {
      try {
        const response = await fetch(`/api/questions/${id}`, { method: "DELETE" });
        if (response.ok) deleted++;
      } catch {
        // Continue with next
      }
    }
    setDeleting(false);
    setQuestions((prev) => prev.filter((q) => !selectedIds.has(q.id)));
    setSelectedIds(new Set());
    toast(`Deleted ${deleted} question(s)`, "success");
  }

  // Get unique categories
  const categories = Array.from(new Set(questions.map((q) => q.category).filter((c): c is string => !!c)));

  // Filter and sort questions
  const filtered = questions
    .filter(
      (q) =>
        q.text.toLowerCase().includes(search.toLowerCase()) ||
        q.category?.toLowerCase().includes(search.toLowerCase()) ||
        q.languages?.some((t: string) => t.toLowerCase().includes(search.toLowerCase())),
    )
    .filter((q) => !categoryFilter || q.category === categoryFilter)
    .filter((q) => !levelFilter || q.level === levelFilter)
    .sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let aVal: any = a[sortBy as keyof Question];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let bVal: any = b[sortBy as keyof Question];

      if (sortBy === "text") {
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
      const response = await fetch("/api/save-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.text,
          answer: form.answer,
          category: form.category || null,
          level: form.level,
          languages: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      const result = await response.json();
      setSaving(false);

      if (!response.ok) {
        toast(result.error || "Failed to add question", "error");
      } else {
        setQuestions((prev) => [result.question, ...prev]);
        setForm({ text: "", answer: "", category: "", level: "mid", tags: "" });
        setShowAdd(false);
        toast("Question added", "success");
      }
    } catch (error) {
      setSaving(false);
      toast("Error saving question", "error");
    }
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <Input placeholder="Search questions, topics, tags…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 max-w-sm" />
        <span className="text-sm text-slate-400">{filtered.length} questions</span>
        {selectedIds.size > 0 && (
          <>
            <span className="text-sm text-slate-400">{selectedIds.size} selected</span>
            <Button
              size="sm"
              variant="secondary"
              loading={deleting}
              onClick={() => {
                setSelectedIds(new Set(filtered.filter((q) => !selectedIds.has(q.id)).map((q) => q.id)));
              }}
            >
              Select all
            </Button>
            <Button size="sm" variant="danger" loading={deleting} onClick={handleDeleteSelected}>
              🗑️ Delete selected
            </Button>
          </>
        )}
        <Button size="sm" variant="secondary" loading={augmenting} onClick={handleAugmentAll} disabled={filtered.length === 0}>
          ✨ Augment all
        </Button>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "+ Add"}
        </Button>
      </div>

      {/* Filters and Sort */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[{ value: "", label: "All Categories" }, ...categories.map((cat) => ({ value: cat, label: cat }))]}
          className="w-48"
        />
        <Select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          options={[
            { value: "", label: "All Levels" },
            { value: "junior", label: "Junior" },
            { value: "mid", label: "Mid" },
            { value: "senior", label: "Senior" },
          ]}
          className="w-40"
        />
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "created_at", label: "Newest" },
            { value: "text", label: "Title" },
            { value: "level", label: "Level" },
            { value: "category", label: "Category" },
          ]}
          className="w-40"
        />
        <Select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          options={[
            { value: "desc", label: "Descending" },
            { value: "asc", label: "Ascending" },
          ]}
          className="w-40"
        />
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card p-5 mb-4 space-y-4">
          <Textarea label="Question" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={2} required />
          <Textarea label="Answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} required />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="React hooks" />
            <Select
              label="Level"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value as Question["level"] })}
              options={[
                { value: "junior", label: "Junior" },
                { value: "mid", label: "Mid" },
                { value: "senior", label: "Senior" },
              ]}
            />
            <Input label="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="react, hooks, state" />
          </div>
          <Button type="submit" loading={saving}>
            Save question
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {filtered.map((q) => (
          <div key={q.id} className="card overflow-hidden">
            <div className="w-full p-4 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedIds.has(q.id)}
                  onChange={(e) => {
                    const newSet = new Set(selectedIds);
                    if (e.target.checked) {
                      newSet.add(q.id);
                    } else {
                      newSet.delete(q.id);
                    }
                    setSelectedIds(newSet);
                  }}
                  className="mt-1"
                />
                <button className="text-left flex-1" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                  <p className="text-sm font-medium text-slate-900">{q.text}</p>
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {q.category && <span className="text-xs text-slate-400">{q.category}</span>}
                <Badge variant={levelVariant[q.level as keyof typeof levelVariant] ?? "default"}>{q.level}</Badge>
                {(q as unknown as { simple_explanation?: string }).simple_explanation && <Badge variant="success">✓ Augmented</Badge>}
                <button onClick={() => handleDeleteQuestion(q.id)} className="text-slate-400 hover:text-red-500 text-xs">
                  🗑️
                </button>
                <span className={cn("text-slate-400 transition-transform text-xs", expanded === q.id && "rotate-180")} onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                  ▼
                </span>
              </div>
            </div>
            {expanded === q.id && (
              <div className="px-4 pb-4 border-t border-slate-100">
                <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">
                  <strong>Answer:</strong> {q.answer}
                </p>

                {(q as unknown as { simple_explanation?: string }) && (
                  <div className="mt-4 bg-blue-50 p-3 rounded">
                    <p className="text-xs font-semibold text-blue-900">Simple Explanation:</p>
                    <p className="text-xs text-blue-800 mt-1">{(q as unknown as { simple_explanation?: string }).simple_explanation}</p>
                  </div>
                )}

                {(q as unknown as { examples?: string[] })?.examples && (q as unknown as { examples?: string[] }).examples!.length > 0 && (
                  <div className="mt-3 bg-green-50 p-3 rounded">
                    <p className="text-xs font-semibold text-green-900">Examples:</p>
                    <ul className="text-xs text-green-800 mt-2 space-y-1">
                      {(q as unknown as { examples?: string[] }).examples!.map((ex: string, i: number) => (
                        <li key={i} className="list-disc list-inside">
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(q as unknown as { code_examples?: Array<{ language: string; code: string }> })?.code_examples &&
                  (q as unknown as { code_examples?: Array<{ language: string; code: string }> }).code_examples!.length > 0 && (
                    <div className="mt-3 bg-purple-50 p-3 rounded">
                      <p className="text-xs font-semibold text-purple-900">Code Examples:</p>
                      <div className="mt-2 space-y-2">
                        {(q as unknown as { code_examples?: Array<{ language: string; code: string }> }).code_examples!.map((ex: { language: string; code: string }, i: number) => (
                          <div key={i} className="bg-slate-900 p-2 rounded text-xs">
                            <p className="text-purple-300 font-semibold mb-1">{ex.language}</p>
                            <pre className="text-slate-300 overflow-x-auto text-[10px]">
                              <code>{ex.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {q.languages?.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {q.languages.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                )}

                {!(q as unknown as { simple_explanation?: string })?.simple_explanation && (
                  <Button size="sm" variant="secondary" loading={augmenting} onClick={() => handleAugmentQuestion(q.id)} className="mt-4">
                    ✨ Augment with AI
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">{search ? "No matching questions" : "No questions yet"}</div>}
      </div>
    </div>
  );
}

export function QuestionsListSkeleton() {
  return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  );
}
