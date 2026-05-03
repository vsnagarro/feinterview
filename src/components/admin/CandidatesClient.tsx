"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { formatDateShort } from "@/lib/utils";

interface CandidateRow {
  id: string;
  name: string;
  email: string | null;
  experience_level: string | null;
  skills: string[];
  created_at: string;
  resume_url: string | null;
  sessions: { id: string; status: string }[];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  active: "success",
  selected: "success",
  completed: "info",
  submitted: "info",
  pending: "warning",
  draft: "warning",
  failed: "danger",
  expired: "default",
};

export function CandidatesClient({ candidates: initial }: { candidates: CandidateRow[] }) {
  const router = useRouter();
  const [candidates, setCandidates] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const allSelected = candidates.length > 0 && selected.size === candidates.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  }

  function toggleOne(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (!confirm(`Delete ${selected.size} candidate${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    const ids = Array.from(selected);
    try {
      const results = await Promise.all(ids.map((id) => fetch(`/api/candidates/${id}`, { method: "DELETE" })));
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) throw new Error(`${failed} deletion(s) failed`);
      setCandidates((prev) => prev.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
      toast(`${ids.length} candidate${ids.length > 1 ? "s" : ""} deleted`, "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error deleting candidates", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-400 text-sm mb-4">No candidates yet. Candidates are created when you start a new interview session.</p>
        <Link href="/sessions/new">
          <Button>Create your first session</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm text-red-700 font-medium">
            {selected.size} candidate{selected.size > 1 ? "s" : ""} selected
          </span>
          <Button size="sm" variant="danger" loading={deleting} onClick={handleDelete}>
            Delete selected
          </Button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-700 ml-auto">
            Clear selection
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" title="Select all" />
          <span className="flex-1">Candidate</span>
          <span className="w-28 text-center">Latest Status</span>
          <span className="w-20 text-right">Added</span>
          <span className="w-6" />
        </div>

        <div className="divide-y divide-slate-100">
          {candidates.map((candidate) => {
            const sessionCount = candidate.sessions?.length ?? 0;
            const latestSession = candidate.sessions?.[0];
            const latestStatus = latestSession?.status;
            const isSelected = selected.has(candidate.id);

            return (
              <div key={candidate.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-sky-50" : "hover:bg-slate-50"}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onClick={(e) => toggleOne(candidate.id, e)}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 shrink-0"
                />

                <Link href={`/candidates/${candidate.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900 text-sm">{candidate.name}</span>
                    {candidate.experience_level && <Badge variant="default">{candidate.experience_level}</Badge>}
                    {candidate.resume_url && <Badge variant="info">Resume</Badge>}
                  </div>
                  {candidate.email && <p className="text-xs text-slate-500 mt-0.5">{candidate.email}</p>}
                  {candidate.skills?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                      {candidate.skills.slice(0, 5).join(", ")}
                      {candidate.skills.length > 5 && ` +${candidate.skills.length - 5} more`}
                    </p>
                  )}
                </Link>

                <div className="w-28 flex items-center justify-center gap-1">
                  {latestStatus ? <Badge variant={statusVariant[latestStatus] ?? "default"}>{latestStatus}</Badge> : <span className="text-xs text-slate-400">No sessions</span>}
                  {sessionCount > 1 && <span className="text-xs text-slate-400">+{sessionCount - 1}</span>}
                </div>

                <span className="w-20 text-right text-xs text-slate-400 shrink-0">{formatDateShort(candidate.created_at)}</span>

                <Link href={`/candidates/${candidate.id}`} className="w-6 text-slate-400 hover:text-sky-600 text-sm flex justify-end" title="View candidate">
                  →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
