import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChevronRight, Check } from "lucide-react";
import { formatDateShort } from "@/lib/utils";
import type { InterviewProfile, Difficulty } from "@/types/app";

const diffVariant: Record<string, "default" | "success" | "warning" | "info"> = {
  junior: "success",
  mid: "info",
  senior: "warning",
};

interface SessionRow {
  id: string;
  created_at: string;
  status: string;
  feedback: string | null;
  candidate_id: string;
  candidates: { id: string; name: string; email: string | null; resume_url: string | null } | null;
  job_descriptions: { title: string } | null;
  code_challenges: Array<{
    id: string;
    challenge_links: Array<{ id: string; candidate_name: string | null; challenge_submissions: Array<{ id: string }> }>;
  }>;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  let questionCount = 0;
  let snippetCount = 0;
  let sessionCount = 0;
  let candidateCount = 0;
  let profileCount = 0;
  let recentSessions: SessionRow[] = [];
  let recentProfiles: InterviewProfile[] = [];

  try {
    const [qRes, snRes, seRes, candRes, profRes, sessionsRes, profilesRes] = await Promise.all([
      supabase.from("questions").select("*", { count: "exact", head: true }),
      supabase.from("code_snippets").select("*", { count: "exact", head: true }),
      supabase.from("sessions").select("*", { count: "exact", head: true }),
      supabase.from("candidates").select("*", { count: "exact", head: true }),
      supabase.from("job_profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("sessions")
        .select(
          `id, created_at, status, feedback, candidate_id,
          candidates(id, name, email, resume_url),
          job_descriptions(title),
          code_challenges(id, challenge_links(id, candidate_name, challenge_submissions(id)))`,
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("job_profiles").select("*").order("created_at", { ascending: false }).limit(5),
    ]);

    questionCount = qRes.count ?? 0;
    snippetCount = snRes.count ?? 0;
    sessionCount = seRes.count ?? 0;
    candidateCount = candRes.count ?? 0;
    profileCount = profRes.count ?? 0;
    recentSessions = (sessionsRes.data ?? []) as unknown as SessionRow[];
    recentProfiles = (profilesRes.data ?? []) as InterviewProfile[];
  } catch (err) {
    console.error("Dashboard data load error:", err);
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded p-6">
          <h2 className="text-xl font-semibold text-red-700">Error loading dashboard</h2>
          <p className="text-sm text-red-600 mt-2">There was an error loading dashboard data. Check server logs for details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">All interviewed candidates and session history</p>
        </div>
        <Link href="/sessions/new">
          <Button>+ New Session</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: "Candidates", count: candidateCount, href: "/candidates" },
          { label: "Interview Sessions", count: sessionCount, href: "/sessions" },
          { label: "Job Profiles", count: profileCount, href: "/profiles" },
          { label: "Questions", count: questionCount, href: "/library" },
          { label: "Code Snippets", count: snippetCount, href: "/library?tab=snippets" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-5 hover:shadow-md transition-shadow">
            <p className="text-3xl font-bold text-slate-900">{stat.count}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Profiles quick-access */}
      {recentProfiles.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Job Profiles</h2>
            <Link href="/profiles" className="text-sm text-sky-600 hover:underline inline-flex items-center">
              Manage <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {recentProfiles.map((p) => (
              <Link key={p.id} href={`/sessions/new?profileId=${p.id}`} className="p-4 hover:bg-slate-50 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{p.title}</p>
                    {p.position && <p className="text-xs text-slate-500 truncate">{p.position}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={diffVariant[p.level as Difficulty] ?? "default"}>{p.level}</Badge>
                      <span className="text-xs text-slate-400">
                        {p.question_count}Q / {p.challenge_count}C
                      </span>
                    </div>
                  </div>
                  <span className="text-sky-600 text-xs shrink-0 group-hover:underline mt-0.5 inline-flex items-center">
                    Start <ChevronRight className="h-4 w-4 ml-2" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {profileCount > recentProfiles.length && (
            <div className="p-3 border-t border-slate-100 text-center">
              <Link href="/profiles" className="text-sm text-sky-600 hover:underline inline-flex items-center">
                View all {profileCount} profiles <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Sessions table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">All Interview Sessions</h2>
          <Link href="/sessions" className="text-sm text-sky-600 hover:underline inline-flex items-center">
            Manage <ChevronRight className="h-4 w-4 ml-2" />
          </Link>
        </div>

        {recentSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-600">Candidate</th>
                  <th className="text-left p-3 font-medium text-slate-600">Role</th>
                  <th className="text-left p-3 font-medium text-slate-600">Date</th>
                  <th className="text-left p-3 font-medium text-slate-600">Status</th>
                  <th className="text-left p-3 font-medium text-slate-600">Challenges</th>
                  <th className="text-left p-3 font-medium text-slate-600">Submissions</th>
                  <th className="text-left p-3 font-medium text-slate-600">Feedback</th>
                  <th className="text-left p-3 font-medium text-slate-600">Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSessions.map((session) => {
                  const submissionCount = (session.code_challenges ?? []).reduce((acc, ch) => acc + (ch.challenge_links ?? []).reduce((a, l) => a + (l.challenge_submissions?.length ?? 0), 0), 0);
                  const challengeCount = session.code_challenges?.length ?? 0;
                  const hasResume = !!session.candidates?.resume_url;
                  const hasFeedback = !!session.feedback;

                  return (
                    <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <Link href={`/sessions/${session.id}`} className="font-medium text-slate-900 hover:text-sky-600">
                          {session.candidates?.name ?? "—"}
                        </Link>
                        {session.candidates?.email && <p className="text-xs text-slate-400">{session.candidates.email}</p>}
                      </td>
                      <td className="p-3 text-slate-600">{session.job_descriptions?.title ?? "—"}</td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{formatDateShort(session.created_at)}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            session.status === "selected" || session.status === "active"
                              ? "success"
                              : session.status === "completed" || session.status === "submitted"
                                ? "info"
                                : session.status === "draft" || session.status === "pending"
                                  ? "warning"
                                  : session.status === "failed"
                                    ? "danger"
                                    : "default"
                          }
                        >
                          {session.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">{challengeCount > 0 ? <span className="font-medium">{challengeCount}</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3 text-center">
                        {submissionCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <Check className="h-4 w-4" /> {submissionCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {hasFeedback ? (
                          <span className="text-emerald-600 text-xs">
                            <Check className="inline-block h-4 w-4 mr-1" />
                            Added
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {hasResume ? (
                          <Link href={`/sessions/${session.id}`} className="text-sky-600 text-xs hover:underline">
                            View
                          </Link>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            No sessions yet.{" "}
            <Link href="/sessions/new" className="text-sky-600 hover:underline">
              Create your first session
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
