import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminCodeViewer } from "@/components/admin/AdminCodeViewer";
import { Badge } from "@/components/ui/Badge";
import { timeUntil, isExpired } from "@/lib/utils";

export default async function AdminLiveViewPage({ params }: { params: Promise<{ id: string; challengeId: string }> }) {
  const { id: sessionId, challengeId } = await params;
  const supabase = await createClient();

  // challengeId here is the link ID
  const { data: linkData } = await supabase.from("challenge_links").select("*").eq("id", challengeId).single();

  if (!linkData) notFound();
  const link = linkData as { id: string; challenge_id: string; expires_at: string; is_active: boolean; opened_at: string | null; candidate_name: string | null };

  const { data: challengeData } = await supabase.from("code_challenges").select("*").eq("id", link.challenge_id).single();
  const challenge = challengeData as { id: string; title: string; problem_statement: string; session_id: string | null } | null;

  if (!challenge) notFound();

  // Get candidate name for display
  const { data: sessionData } = await supabase
    .from("sessions")
    .select("candidate_id")
    .eq("id", challenge.session_id ?? "")
    .single();
  const session = sessionData as { candidate_id: string } | null;

  const candidateName = await (async () => {
    if (!session) return null;
    const { data } = await supabase.from("candidates").select("name").eq("id", session.candidate_id).single();
    return (data as { name: string } | null)?.name ?? null;
  })();

  const expired = isExpired(link.expires_at);

  return (
    <div className="p-6 flex flex-col h-full min-h-screen">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/sessions/${sessionId}`} className="text-sm text-slate-500 hover:text-sky-600">
              ← Session
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Live Code View — {challenge.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {expired ? <Badge variant="danger">Link expired</Badge> : <Badge variant="success">Active — {timeUntil(link.expires_at)} left</Badge>}
          {link.opened_at ? <Badge variant="info">Candidate connected</Badge> : <Badge variant="default">Waiting for candidate</Badge>}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AdminCodeViewer linkId={link.id} problemStatement={challenge.problem_statement} candidateName={link.candidate_name ?? candidateName} />
      </div>
    </div>
  );
}
