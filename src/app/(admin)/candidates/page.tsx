import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { CandidatesClient } from "@/components/admin/CandidatesClient";

export default async function CandidatesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("candidates").select("id, name, email, experience_level, skills, created_at, resume_url, sessions(id, status)").order("created_at", { ascending: false });

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

  const candidates = (data ?? []) as Parameters<typeof CandidatesClient>[0]["candidates"];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
          <p className="text-slate-500 text-sm mt-1">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/sessions/new">
          <Button>+ New Interview Session</Button>
        </Link>
      </div>
      <CandidatesClient candidates={candidates} />
    </div>
  );
}
