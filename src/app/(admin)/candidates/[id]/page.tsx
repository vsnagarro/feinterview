import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateShort } from "@/lib/utils";

interface CandidateRecord {
  id: string;
  name: string;
  email: string | null;
  experience_level: string | null;
  skills: string[];
  summary: string | null;
  created_at: string;
  resume_url: string | null;
}

interface SessionRecord {
  id: string;
  created_at: string;
  status: string;
  languages: string[];
  feedback: string | null;
  recommendations: string | null;
  screenshot_url: string | null;
  profile_id: string | null;
  job_descriptions: { title: string } | null;
  job_profiles: { title: string; position: string | null } | null;
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

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CandidateDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: candidateData } = await supabase.from("candidates").select("*").eq("id", id).single();
  if (!candidateData) notFound();
  const candidate = candidateData as CandidateRecord;

  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("id, created_at, status, languages, feedback, recommendations, screenshot_url, profile_id, job_descriptions(title), job_profiles(title, position)")
    .eq("candidate_id", id)
    .order("created_at", { ascending: false });

  const sessions = (sessionsData ?? []) as unknown as SessionRecord[];

  // Resume signed URL
  let resumeSignedUrl: string | null = null;
  if (candidate.resume_url) {
    const path = candidate.resume_url.replace(/^resumes\//, "");
    const { data: sd } = await serviceClient.storage.from("resumes").createSignedUrl(path, 3600);
    resumeSignedUrl = sd?.signedUrl ?? null;
  }

  // Screenshot signed URLs for each session
  const screenshotUrls = new Map<string, string>();
  const sessionsWithScreenshots = sessions.filter((s) => s.screenshot_url);
  await Promise.all(
    sessionsWithScreenshots.map(async (s) => {
      const path = s.screenshot_url!.replace(/^screenshots\//, "");
      const { data: sd } = await serviceClient.storage.from("screenshots").createSignedUrl(path, 3600);
      if (sd?.signedUrl) screenshotUrls.set(s.id, sd.signedUrl);
    }),
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/candidates" className="text-sm text-slate-500 hover:text-sky-600">
            ← Candidates
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{candidate.name}</h1>
          {candidate.email && <p className="text-slate-500 text-sm mt-0.5">{candidate.email}</p>}
        </div>
        <Link href="/sessions/new">
          <Button size="sm">+ New Interview Session</Button>
        </Link>
      </div>

      {/* Candidate info */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Candidate Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {candidate.experience_level && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Experience Level</p>
              <p className="font-medium text-slate-800">{candidate.experience_level}</p>
            </div>
          )}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Total Interviews</p>
            <p className="font-medium text-slate-800">
              {sessions.length} interview session{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Added</p>
            <p className="font-medium text-slate-800">{formatDateShort(candidate.created_at)}</p>
          </div>
          {candidate.skills?.length > 0 && (
            <div className="sm:col-span-2 bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <span key={skill} className="text-xs bg-white border border-slate-200 text-slate-700 rounded-full px-2 py-0.5">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {candidate.summary && (
            <div className="sm:col-span-2 bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Summary</p>
              <p className="text-slate-700">{candidate.summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Resume */}
      {candidate.resume_url && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Resume</h2>
          <div className="flex items-center justify-between gap-4 bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{candidate.resume_url.split("/").pop()}</p>
                <p className="text-xs text-slate-400">Uploaded {formatDateShort(candidate.created_at)}</p>
              </div>
            </div>
            {resumeSignedUrl ? (
              <a href={resumeSignedUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="secondary">
                  View Resume ↗
                </Button>
              </a>
            ) : (
              <span className="text-xs text-slate-400">Preview unavailable</span>
            )}
          </div>
        </div>
      )}

      {/* Interview Sessions */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Interview Sessions ({sessions.length})</h2>
          <Link href="/sessions/new">
            <Button size="sm" variant="secondary">
              + New Session
            </Button>
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No interview sessions yet.{" "}
            <Link href="/sessions/new" className="text-sky-600 hover:underline">
              Start the first one
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((session) => {
              const screenshotUrl = screenshotUrls.get(session.id);
              const jobTitle = session.job_descriptions?.title;
              const profileTitle = session.job_profiles?.title;

              return (
                <div key={session.id} className="p-5 hover:bg-slate-50 transition-colors">
                  {/* Session header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {jobTitle && <p className="font-medium text-slate-900">{jobTitle}</p>}
                        {profileTitle && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{profileTitle}</span>}
                        <Badge variant={statusVariant[session.status] ?? "default"}>{session.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>{formatDateShort(session.created_at)}</span>
                        {session.languages?.length > 0 && <span>{session.languages.join(", ")}</span>}
                      </div>
                    </div>
                    <Link href={`/sessions/${session.id}`} className="shrink-0">
                      <Button size="sm" variant="secondary">
                        View Session →
                      </Button>
                    </Link>
                  </div>

                  {/* Screenshot */}
                  {screenshotUrl && (
                    <div className="mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotUrl} alt="Interview session screenshot" className="rounded-lg border border-slate-200 max-h-48 object-cover" />
                    </div>
                  )}

                  {/* Feedback */}
                  {session.feedback && (
                    <div className="mb-2 bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Feedback</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{session.feedback}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {session.recommendations && (
                    <div className="bg-sky-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-sky-700 mb-1">Recommendations</p>
                      <p className="text-sm text-sky-900 whitespace-pre-wrap">{session.recommendations}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
