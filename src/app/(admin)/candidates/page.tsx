import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateShort } from "@/lib/utils";

interface CandidateRow {
  id: string;
  name: string;
  email: string | null;
  experience_level: string | null;
  skills: string[];
  summary: string | null;
  created_at: string;
  resume_url: string | null;
  sessions: { id: string; status: string }[];
}

export default async function CandidatesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .select("id, name, email, experience_level, skills, summary, created_at, resume_url, sessions(id, status)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded p-6">
          <h2 className="text-xl font-semibold text-red-700">Error loading candidates</h2>
          <p className="text-sm text-red-600 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  const candidates = (data ?? []) as CandidateRow[];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
          <p className="text-slate-500 text-sm mt-1">{candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/sessions/new">
          <Button>+ New Session</Button>
        </Link>
      </div>

      {candidates.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm mb-4">No candidates yet. Candidates are created when you start a new session.</p>
          <Link href="/sessions/new">
            <Button>Create your first session</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map((candidate) => {
            const sessionCount = candidate.sessions?.length ?? 0;
            const activeSession = candidate.sessions?.find((s) => s.status === "active");
            const latestSession = candidate.sessions?.[0];

            return (
              <div key={candidate.id} className="card flex items-center justify-between p-4 gap-4 hover:shadow-md transition-shadow">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{candidate.name}</p>
                    {candidate.experience_level && (
                      <Badge variant="default">{candidate.experience_level}</Badge>
                    )}
                    {candidate.resume_url && (
                      <Badge variant="info">Resume</Badge>
                    )}
                  </div>
                  {candidate.email && (
                    <p className="text-sm text-slate-500 mt-0.5">{candidate.email}</p>
                  )}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1 truncate max-w-xl">
                      {candidate.skills.slice(0, 6).join(", ")}
                      {candidate.skills.length > 6 && ` +${candidate.skills.length - 6} more`}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">Added {formatDateShort(candidate.created_at)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeSession ? (
                    <Badge variant="success">Active session</Badge>
                  ) : sessionCount > 0 ? (
                    <span className="text-xs text-slate-500">
                      {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No sessions</span>
                  )}

                  {latestSession && (
                    <Link href={`/sessions/${latestSession.id}`}>
                      <Button size="sm" variant="secondary">
                        View session →
                      </Button>
                    </Link>
                  )}

                  <Link href={`/sessions/new`}>
                    <Button size="sm" variant="secondary">
                      + Session
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
