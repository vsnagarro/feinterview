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

const difficultyVariant = {
  junior: "success",
  mid: "warning",
  senior: "danger",
} as const;

export function QuestionsList({ initialQuestions }: QuestionsListProps) {
  const supabase = createClient();
  const [questions, setQuestions] = useState(initialQuestions);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    text: "",
    answer: "",
    category: "",
    difficulty: "mid" as Question["difficulty"],
    tags: "",
  });

  const filtered = questions.filter(
    (q) =>
      q.text.toLowerCase().includes(search.toLowerCase()) || q.category?.toLowerCase().includes(search.toLowerCase()) || q.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase())),
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from("questions")
      .insert({
        text: form.text,
        answer: form.answer,
        category: form.category || null,
        difficulty: form.difficulty,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      toast("Failed to add question", "error");
    } else {
      setQuestions((prev) => [data, ...prev]);
      setForm({ text: "", answer: "", category: "", difficulty: "mid", tags: "" });
      setShowAdd(false);
      toast("Question added", "success");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Input placeholder="Search questions, topics, tags…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <span className="text-sm text-slate-400 ml-auto">{filtered.length} questions</span>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "+ Add question"}
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card p-5 mb-4 space-y-4">
          <Textarea label="Question" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={2} required />
          <Textarea label="Answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} required />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="React hooks" />
            <Select
              label="Difficulty"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as Question["difficulty"] })}
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
                <Badge variant={difficultyVariant[q.difficulty as keyof typeof difficultyVariant] ?? "default"}>{q.difficulty}</Badge>
                <span className={cn("text-slate-400 transition-transform text-xs", expanded === q.id && "rotate-180")}>▼</span>
              </div>
            </button>
            {expanded === q.id && (
              <div className="px-4 pb-4 border-t border-slate-100">
                <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{q.answer}</p>
                {q.tags.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {q.tags.map((tag) => (
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
