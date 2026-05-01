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
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();
  const [questions, setQuestions] = useState(initialQuestions);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    text: "",
    answer: "",
    category: "",
    level: "mid" as Question["level"],
    tags: "",
  });

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
            <button className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
              <p className="text-sm font-medium text-slate-900 flex-1">{q.text}</p>
              <div className="flex items-center gap-2 shrink-0">
                {q.category && <span className="text-xs text-slate-400">{q.category}</span>}
                <Badge variant={levelVariant[q.level as keyof typeof levelVariant] ?? "default"}>{q.level}</Badge>
                <span className={cn("text-slate-400 transition-transform text-xs", expanded === q.id && "rotate-180")}>▼</span>
              </div>
            </button>
            {expanded === q.id && (
              <div className="px-4 pb-4 border-t border-slate-100">
                <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{q.answer}</p>
                {q.languages?.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {q.languages.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
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
