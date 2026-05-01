import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DeleteSessionButton } from "@/components/admin/DeleteSessionButton";
import { formatDateShort } from "@/lib/utils";

interface SessionRow {
  id: string;
  created_at: string;
  status: string;
  candidate_id: string;
  job_description_id: string | null;
  languages: string[];
  session_questions: { count: number }[];
  code_challenges: { count: number }[];
}
interface CandidateRow {
  id: string;
  name: string;
}
interface JDRow {
  id: string;
  title: string;
}

export default async function SessionsPage() {
  const supabase = await createClient();

  const [{ data: sessions }, { data: candidates }, { data: jds }] = await Promise.all([
    supabase.from("sessions").select("*, session_questions(count), code_challenges(count)").order("created_at", { ascending: false }),
    supabase.from("candidates").select("id, name"),
    supabase.from("job_descriptions").select("id, title"),
  ]);

  const candidateMap = new Map<string, string>((candidates as CandidateRow[] | null)?.map((c) => [c.id, c.name]) ?? []);
  const jdMap = new Map<string, JDRow>((jds as JDRow[] | null)?.map((j) => [j.id, j]) ?? []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-slate-500 text-sm mt-1">{sessions?.length ?? 0} interview sessions</p>
        </div>
        <Link href="/sessions/new">
          <Button>New Session</Button>
        </Link>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="space-y-2">
          {(sessions as SessionRow[]).map((session) => {
            const candidateName = candidateMap.get(session.candidate_id) ?? "Unknown";
            const jd = session.job_description_id ? jdMap.get(session.job_description_id) : null;
            const qCount = session.session_questions?.[0]?.count ?? 0;
            const cCount = session.code_challenges?.[0]?.count ?? 0;
            return (
              <div key={session.id} className="card flex w-full items-center justify-between p-4 hover:shadow-md transition-shadow">
                <Link href={`/sessions/${session.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{candidateName}</p>
                  {jd && <p className="text-xs text-slate-500 mt-0.5">{jd.title}</p>}
                  <p className="text-xs text-slate-400 mt-1">{formatDateShort(session.created_at)}</p>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500">
                    {qCount}Q / {cCount}C
                  </span>
                  {session.languages[0] && <Badge variant="default">{session.languages[0]}</Badge>}
                  <Badge variant={session.status === "active" ? "success" : session.status === "completed" ? "info" : "default"}>{session.status}</Badge>
                  <DeleteSessionButton sessionId={session.id} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm mb-4">No sessions yet</p>
          <Link href="/sessions/new">
            <Button>Create your first session</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
