import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminLivePreviewClient } from "@/components/challenge/AdminLivePreviewClient";
import { Badge } from "@/components/ui/Badge";
import { timeUntil, isExpired } from "@/lib/utils";

export default async function AdminLiveViewPage({ params }: { params: Promise<{ id: string; challengeId: string }> }) {
  const { id: sessionId, challengeId } = await params;
  const supabase = await createClient();

  // challengeId here is the link ID
  const { data: linkData } = await supabase.from("challenge_links").select("*").eq("id", challengeId).single();

  if (!linkData) notFound();
  const link = linkData as { id: string; challenge_id: string; token: string; expires_at: string; is_active: boolean; opened_at: string | null; candidate_name: string | null };

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
    <AdminLivePreviewClient
      linkId={link.id}
      linkToken={link.token}
      candidateName={link.candidate_name ?? candidateName ?? null}
      sessionId={sessionId}
      expiresAt={link.expires_at}
      isExpired={expired}
    />
  );
}
