import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { ChallengeLinkGenerator } from "@/components/admin/ChallengeLinkGenerator";
import { SaveToLibraryButton } from "@/components/admin/SaveToLibraryButton";
import { DeleteSessionButton } from "@/components/admin/DeleteSessionButton";
import { SessionFeedback } from "@/components/admin/SessionFeedback";
import { formatDateShort } from "@/lib/utils";

interface SessionRecord {
  id: string;
  created_at: string;
  status: string;
  candidate_id: string;
  job_description_id: string | null;
  languages: string[];
  feedback: string | null;
  recommendations: string | null;
  screenshot_url: string | null;
}
interface Candidate {
  id: string;
  name: string;
  email: string | null;
  skills: string[];
  experience_level: string | null;
  summary: string | null;
  resume_url: string | null;
}
interface JD {
  id: string;
  title: string;
}
interface SessionQuestion {
  id: string;
  question: string;
  answer: string;
  explanation: string | null;
  metadata: {
    explanation?: string | null;
    simpleExplanation?: string | null;
    highlights?: string[] | null;
    codeExamples?: { language: string; code: string }[] | null;
    // legacy field names
    topicExplanation?: string | null;
    analogy?: string | null;
  } | null;
  order_index: number;
  asked: boolean;
  rating: number | null;
  question_id: string | null;
}
interface CodeChallenge {
  id: string;
  title: string;
  problem_statement: string;
  snippet_id: string | null;
}
interface ChallengeLink {
  id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  candidate_name: string | null;
  opened_at: string | null;
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).single();

  if (!session) notFound();
  const typedSession = session as SessionRecord;

  const [{ data: candidate }, { data: jd }, { data: questions }, { data: challenges }] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", typedSession.candidate_id).single(),
    typedSession.job_description_id ? supabase.from("job_descriptions").select("id, title").eq("id", typedSession.job_description_id).single() : Promise.resolve({ data: null }),
    supabase.from("session_questions").select("*").eq("session_id", id).order("order_index"),
    supabase.from("code_challenges").select("*").eq("session_id", id).order("created_at"),
  ]);

  // Fetch challenge submissions through challenge_links
  const challengeIds = (challenges ?? []).map((c: CodeChallenge) => c.id);
  const { data: links } = challengeIds.length > 0 ? await supabase.from("challenge_links").select("*").in("challenge_id", challengeIds).order("created_at", { ascending: false }) : { data: [] };
  const challengeLinks = (links as (ChallengeLink & { challenge_id?: string })[] | null) ?? [];
  const linkIds = challengeLinks.map((l) => l.id);
  const { data: rawSubmissions } =
    linkIds.length > 0
      ? await supabase.from("challenge_submissions").select("id, created_at, language, code, is_snapshot, link_id").in("link_id", linkIds).order("created_at", { ascending: false })
      : { data: [] };
  const submissions = (rawSubmissions ?? []) as Array<{ id: string; created_at: string; language: string; code: string; is_snapshot: boolean; link_id: string }>;

  // Resume signed URL (private bucket)
  const typedCandidate = candidate as Candidate | null;
  let resumeSignedUrl: string | null = null;
  if (typedCandidate?.resume_url) {
    const service = await createServiceClient();
    const path = typedCandidate.resume_url.replace(/^resumes\//, "");
    const { data: sd } = await service.storage.from("resumes").createSignedUrl(path, 3600);
    resumeSignedUrl = sd?.signedUrl ?? null;
  }

  // Screenshot signed URL
  let screenshotSignedUrl: string | null = null;
  if (typedSession.screenshot_url) {
    const service = await createServiceClient();
    const path = typedSession.screenshot_url.replace(/^screenshots\//, "");
    const { data: sd } = await service.storage.from("screenshots").createSignedUrl(path, 3600);
    screenshotSignedUrl = sd?.signedUrl ?? null;
  }
  const typedJD = jd as JD | null;
  const typedQuestions = (questions as SessionQuestion[]) ?? [];
  const typedChallenges = (challenges as CodeChallenge[]) ?? [];
  const unsavedQCount = typedQuestions.filter((q) => !q.question_id).length;
  const unsavedCCount = typedChallenges.filter((c) => !c.snippet_id).length;
  const challengeIds2 = typedChallenges.map((challenge) => challenge.id);
  const linksByChallengeId = new Map<string, ChallengeLink[]>();
  challengeLinks.forEach((link) => {
    const challengeId = (link as ChallengeLink & { challenge_id?: string }).challenge_id;
    if (!challengeId) return;
    linksByChallengeId.set(challengeId, [...(linksByChallengeId.get(challengeId) ?? []), link]);
  });
  void challengeIds2;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/sessions" className="text-sm text-slate-500 hover:text-sky-600">
              ← Interview Sessions
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{typedCandidate?.name ?? "Session"}</h1>
          {typedJD && <p className="text-slate-500 text-sm mt-1">{typedJD.title}</p>}
          <div className="flex items-center gap-2 mt-2">
            {typedSession.languages.map((language) => (
              <Badge key={language} variant="default">
                {language}
              </Badge>
            ))}
            <Badge variant={typedSession.status === "active" ? "success" : typedSession.status === "completed" ? "info" : "default"}>{typedSession.status}</Badge>
            <span className="text-xs text-slate-400">{formatDateShort(typedSession.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SaveToLibraryButton sessionId={id} questionCount={unsavedQCount} challengeCount={unsavedCCount} />
          <DeleteSessionButton sessionId={id} redirectTo="/sessions" />
        </div>
      </div>

      {/* Candidate details */}
      {typedCandidate && (
        <div className="card p-4">
          <h2 className="font-semibold text-slate-900 mb-3">Candidate</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-slate-500">Name:</span> {typedCandidate.name}
            </div>
            {typedCandidate.email && (
              <div>
                <span className="text-slate-500">Email:</span> {typedCandidate.email}
              </div>
            )}
            {typedCandidate.experience_level && (
              <div>
                <span className="text-slate-500">Experience:</span> {typedCandidate.experience_level}
              </div>
            )}
            {typedCandidate.skills?.length > 0 && (
              <div className="col-span-2">
                <span className="text-slate-500">Skills:</span> {typedCandidate.skills.join(", ")}
              </div>
            )}
            {typedCandidate.summary && (
              <div className="col-span-2">
                <span className="text-slate-500">Summary:</span> {typedCandidate.summary}
              </div>
            )}
            {resumeSignedUrl && (
              <div className="col-span-2">
                <span className="text-slate-500">Resume:</span>{" "}
                <a href={resumeSignedUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline text-sm">
                  View resume ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="card">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Questions ({typedQuestions.length})</h2>
        </div>
        {typedQuestions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {typedQuestions.map((q) => (
              <details key={q.id} className="group">
                <summary className="p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors list-none">
                  <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${q.asked ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`} />
                  <p className="text-sm text-slate-900 flex-1">{q.question}</p>
                  <span className="text-slate-400 text-xs group-open:rotate-180 transition-transform shrink-0">▼</span>
                </summary>
                <div className="px-11 pb-5 space-y-3">
                  {/* 1. Concise answer */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Answer</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{q.answer}</p>
                  </div>

                  {/* 2. Detailed explanation */}
                  {(q.metadata?.explanation ?? q.explanation ?? q.metadata?.topicExplanation) && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Detailed Explanation</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{q.metadata?.explanation ?? q.explanation ?? q.metadata?.topicExplanation}</p>
                    </div>
                  )}

                  {/* 3. Simple terms + analogy */}
                  {(q.metadata?.simpleExplanation ?? q.metadata?.analogy) && (
                    <div className="bg-sky-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-sky-700 mb-1">Simple Terms &amp; Analogy</p>
                      <p className="text-sm text-sky-900 whitespace-pre-wrap">{q.metadata?.simpleExplanation ?? q.metadata?.analogy}</p>
                    </div>
                  )}

                  {/* 4. Code examples */}
                  {q.metadata?.codeExamples && q.metadata.codeExamples.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Code Examples</p>
                      <div className="space-y-2">
                        {q.metadata.codeExamples.map((ex, i) => (
                          <div key={i} className="bg-slate-900 rounded-lg p-3">
                            <p className="text-xs text-slate-400 font-mono mb-2">{ex.language}</p>
                            <pre className="text-xs text-slate-100 overflow-x-auto">
                              <code>{ex.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Key takeaways */}
                  {q.metadata?.highlights && q.metadata.highlights.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2">Key Takeaways</p>
                      <ul className="space-y-1">
                        {q.metadata.highlights.map((point, i) => (
                          <li key={i} className="text-sm text-amber-900 flex gap-2">
                            <span className="text-amber-500 shrink-0">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">No questions yet — they are added when you create a session with AI generation.</div>
        )}
      </div>

      {/* Code Challenges */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Code Challenges ({typedChallenges.length})</h2>
        {typedChallenges.length > 0 ? (
          <div className="space-y-4">
            {typedChallenges.map((challenge) => (
              <div key={challenge.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-medium text-slate-900">{challenge.title}</p>
                <p className="mt-1 text-sm text-slate-500 whitespace-pre-wrap">{challenge.problem_statement}</p>
                <div className="mt-4">
                  <ChallengeLinkGenerator
                    sessionId={id}
                    existingChallenge={{
                      id: challenge.id,
                      title: challenge.title,
                      links: (linksByChallengeId.get(challenge.id) ?? []).map((link) => ({
                        ...link,
                        url: `${appUrl}/challenge/${link.token}`,
                      })),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No code challenges generated yet.</p>
        )}
      </div>
      {submissions.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Code Submissions ({submissions.filter((s) => !s.is_snapshot).length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {submissions
              .filter((s) => !s.is_snapshot)
              .map((sub) => (
                <details key={sub.id} className="group">
                  <summary className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 list-none">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{sub.language}</span>
                      <span className="text-xs text-slate-500">{formatDateShort(sub.created_at)}</span>
                    </div>
                    <span className="text-slate-400 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-4 pb-4">
                    <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto max-h-80">
                      <code>{sub.code}</code>
                    </pre>
                  </div>
                </details>
              ))}
          </div>
        </div>
      )}

      {/* Feedback & Screenshot */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Feedback &amp; Notes</h2>
        <SessionFeedback
          sessionId={id}
          initialFeedback={typedSession.feedback}
          initialRecommendations={typedSession.recommendations ?? null}
          screenshotPath={typedSession.screenshot_url}
          screenshotSignedUrl={screenshotSignedUrl}
        />
      </div>
    </div>
  );
}
