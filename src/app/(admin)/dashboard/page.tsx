import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { formatDateShort } from "@/lib/utils";

interface SessionRow {
  id: string;
  created_at: string;
  status: string;
  candidate_id: string;
  languages: string[];
}

interface CandidateRow {
  id: string;
  name: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  let questionCount = 0;
  let snippetCount = 0;
  let sessionCount = 0;
  let recentSessions: SessionRow[] | null = null;
  let allCandidates: CandidateRow[] | null = null;

  try {
    type CountResult = { count?: number };
    type DataResult<T> = { data?: T[] };

    const [qRes, snRes, seRes, recentRes, candidatesRes] = (await Promise.all([
      supabase.from("questions").select("*", { count: "exact", head: true }),
      supabase.from("code_snippets").select("*", { count: "exact", head: true }),
      supabase.from("sessions").select("*", { count: "exact", head: true }),
      supabase.from("sessions").select("id, created_at, status, candidate_id, languages").order("created_at", { ascending: false }).limit(5),
      supabase.from("candidates").select("id, name"),
    ])) as [CountResult, CountResult, CountResult, DataResult<SessionRow>, DataResult<CandidateRow>];

    questionCount = qRes.count ?? 0;
    snippetCount = snRes.count ?? 0;
    sessionCount = seRes.count ?? 0;
    recentSessions = recentRes.data ?? null;
    allCandidates = candidatesRes.data ?? null;
  } catch (err) {
    console.error("Dashboard data load error:", err);
    // Render dashboard with empty/placeholder values and show a server-side error message
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded p-6">
          <h2 className="text-xl font-semibold text-red-700">Error loading dashboard</h2>
          <p className="text-sm text-red-600 mt-2">There was an error loading dashboard data. Check server logs for details.</p>
        </div>
      </div>
    );
  }

  const candidateMap = new Map<string, string>((allCandidates as CandidateRow[] | null)?.map((c) => [c.id, c.name]) ?? []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your interview sessions and question library</p>
        </div>
        <Link href="/sessions/new">
          <Button>New Session</Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Questions", count: questionCount ?? 0, href: "/library" },
          { label: "Code Snippets", count: snippetCount ?? 0, href: "/library?tab=snippets" },
          { label: "Sessions", count: sessionCount ?? 0, href: "/sessions" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-5 hover:shadow-md transition-shadow">
            <p className="text-3xl font-bold text-slate-900">{stat.count}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Sessions</h2>
          <Link href="/sessions" className="text-sm text-sky-600 hover:underline">
            View all
          </Link>
        </div>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {(recentSessions as SessionRow[]).map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{candidateMap.get(session.candidate_id) ?? "Unknown candidate"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDateShort(session.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {session.languages[0] && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded lowercase">{session.languages[0]}</span>}
                  <span
                    className={`text-xs px-2 py-1 rounded capitalize ${
                      session.status === "active" ? "bg-emerald-100 text-emerald-700" : session.status === "completed" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
              </Link>
            ))}
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
