import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateShort } from "@/lib/utils";
import type { InterviewProfile, Difficulty } from "@/types/app";

const difficultyVariant: Record<string, "default" | "success" | "warning" | "info"> = {
  junior: "success",
  mid: "info",
  senior: "warning",
};

export default async function ProfilesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("job_profiles").select("*").order("created_at", { ascending: false });

  const profiles = (data ?? []) as InterviewProfile[];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Profiles</h1>
          <p className="text-slate-500 text-sm mt-1">Reusable templates that pre-fill JD, level, and generation settings for new sessions</p>
        </div>
        <Link href="/profiles/new">
          <Button>+ New Profile</Button>
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm mb-4">No profiles yet</p>
          <Link href="/profiles/new">
            <Button>Create your first profile</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {profiles.map((p) => (
            <Link key={p.id} href={`/profiles/${p.id}`} className="card p-5 hover:shadow-md transition-shadow flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-slate-900">{p.title}</h2>
                  <Badge variant={difficultyVariant[p.level as Difficulty] ?? "default"}>{p.level}</Badge>
                </div>
                {p.position && <p className="text-sm text-slate-500 mt-0.5">{p.position}</p>}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span>{p.question_count} questions</span>
                  <span>
                    {p.challenge_count} challenge{p.challenge_count !== 1 ? "s" : ""}
                  </span>
                  {p.experience_range && <span>{p.experience_range}</span>}
                  <span>Trickiness {p.trickiness}/5</span>
                  <span>Created {formatDateShort(p.created_at)}</span>
                </div>
                {p.notes && <p className="text-xs text-slate-400 mt-1 truncate max-w-xl">{p.notes}</p>}
              </div>
              <span className="text-sky-600 text-sm shrink-0">View →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
