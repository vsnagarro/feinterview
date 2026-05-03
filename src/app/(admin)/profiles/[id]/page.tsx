import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChevronRight } from "lucide-react";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { formatDateShort } from "@/lib/utils";
import type { InterviewProfile, Difficulty } from "@/types/app";

interface CandidateSessionRow {
  id: string;
  created_at: string;
  status: string;
  feedback: string | null;
  recommendations: string | null;
  candidates: { id: string; name: string; email: string | null } | null;
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

const diffVariant: Record<string, "default" | "success" | "warning" | "info"> = {
  junior: "success",
  mid: "info",
  senior: "warning",
};

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

const STATUS_ORDER = ["selected", "active", "pending", "submitted", "completed", "draft", "failed", "expired"];

const STATUS_LABELS: Record<string, string> = {
  selected: "Selected",
  active: "Active",
  pending: "Pending",
  submitted: "Submitted",
  completed: "Completed",
  draft: "Draft",
  failed: "Failed",
  expired: "Expired",
};

export default async function ProfileDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { edit } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase.from("job_profiles").select("*").eq("id", id).single();
  if (!data) notFound();
  const profile = data as InterviewProfile;

  // Interview sessions from this profile
  const { data: sessionData } = await supabase
    .from("sessions")
    .select("id, created_at, status, feedback, recommendations, candidates(id, name, email)")
    .eq("profile_id", id)
    .order("created_at", { ascending: false });
  const sessions = (sessionData ?? []) as unknown as CandidateSessionRow[];

  // Group by status
  const grouped = new Map<string, CandidateSessionRow[]>();
  for (const s of sessions) {
    const list = grouped.get(s.status) ?? [];
    list.push(s);
    grouped.set(s.status, list);
  }
  const orderedStatuses = STATUS_ORDER.filter((st) => grouped.has(st));
  const totalCandidates = sessions.filter((s) => s.candidates).length;

  if (edit === "1") {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href={`/profiles/${id}`} className="text-sm text-slate-500 hover:text-sky-600">
            ← Back to profile
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Edit Job Profile</h1>
        </div>
        <ProfileForm profile={profile} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/profiles" className="text-sm text-slate-500 hover:text-sky-600">
            ← Job Profiles
          </Link>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{profile.title}</h1>
            <Badge variant={diffVariant[profile.level as Difficulty] ?? "default"}>{profile.level}</Badge>
          </div>
          {profile.position && <p className="text-slate-500 text-sm mt-1">{profile.position}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/profiles/${id}?edit=1`}>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
          <Link href={`/sessions/new?profileId=${id}`}>
            <Button size="sm">+ Start Interview</Button>
          </Link>
        </div>
      </div>

      {/* Settings summary */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Default Generation Settings</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: "Level", value: profile.level },
            { label: "Experience range", value: profile.experience_range ?? "—" },
            { label: "Difficulty", value: profile.difficulty },
            { label: "Questions", value: String(profile.question_count) },
            { label: "Code challenges", value: String(profile.challenge_count) },
            { label: "Trickiness", value: `${profile.trickiness} / 5` },
            { label: "Generate", value: profile.generate_type === "both" ? "Q + Challenges" : profile.generate_type },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="font-medium text-slate-800 capitalize">{value}</p>
            </div>
          ))}
        </div>

        {profile.challenge_guideline && (
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Challenge guideline</p>
            <p className="text-sm text-slate-700">{profile.challenge_guideline}</p>
          </div>
        )}

        {profile.extra_checks && (
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500 mb-1">Extra checks</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{profile.extra_checks}</p>
          </div>
        )}

        {profile.notes && (
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500 mb-1">Internal notes</p>
            <p className="text-sm text-slate-600 italic">{profile.notes}</p>
          </div>
        )}
      </div>

      {/* Job description */}
      {profile.jd_text && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Job Description</h2>
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">{profile.jd_text}</pre>
        </div>
      )}

      {/* Candidates by status */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Candidates ({totalCandidates})</h2>
            {sessions.length > 0 && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {STATUS_ORDER.filter((st) => grouped.has(st)).map((st) => (
                  <span key={st} className="flex items-center gap-1">
                    <Badge variant={statusVariant[st] ?? "default"}>{STATUS_LABELS[st]}</Badge>
                    <span className="text-xs text-slate-500">{grouped.get(st)!.length}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <Link href={`/sessions/new?profileId=${id}`}>
            <Button size="sm">+ Start Interview</Button>
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No candidates yet.{" "}
            <Link href={`/sessions/new?profileId=${id}`} className="text-sky-600 hover:underline">
              Start the first interview
            </Link>
          </div>
        ) : (
          <div>
            {orderedStatuses.map((status) => (
              <div key={status}>
                <div className="px-4 py-2 bg-slate-50 border-y border-slate-100 flex items-center gap-2">
                  <Badge variant={statusVariant[status] ?? "default"}>{STATUS_LABELS[status]}</Badge>
                  <span className="text-xs text-slate-500">{grouped.get(status)!.length}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {grouped.get(status)!.map((s) => (
                    <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {s.candidates ? (
                            <Link href={`/candidates/${s.candidates.id}`} className="font-medium text-slate-900 text-sm hover:text-sky-600">
                              {s.candidates.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-500 text-sm">Unknown candidate</span>
                          )}
                          {s.candidates?.email && <p className="text-xs text-slate-400">{s.candidates.email}</p>}
                          <p className="text-xs text-slate-400 mt-0.5">{formatDateShort(s.created_at)}</p>
                          {s.feedback && (
                            <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                              <span className="font-medium">Feedback:</span> {s.feedback}
                            </p>
                          )}
                          {s.recommendations && (
                            <p className="text-xs text-sky-700 mt-1 line-clamp-2">
                              <span className="font-medium">Recommendations:</span> {s.recommendations}
                            </p>
                          )}
                        </div>
                        <Link href={`/sessions/${s.id}`} className="shrink-0">
                          <Button size="sm" variant="secondary">
                            View <ChevronRight className="inline-block h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
