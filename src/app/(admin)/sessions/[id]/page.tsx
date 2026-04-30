import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { ChallengeLinkGenerator } from '@/components/admin/ChallengeLinkGenerator'
import { formatDateShort } from '@/lib/utils'

interface Candidate { id: string; name: string; email: string | null; skills: string[]; years_exp: number | null }
interface JD { id: string; title: string; company: string | null }
interface SessionQuestion { id: string; question: string; answer: string; order_index: number; asked: boolean; rating: number | null }
interface CodeChallenge { id: string; title: string }
interface ChallengeLink { id: string; token: string; expires_at: string; is_active: boolean; candidate_name: string | null; opened_at: string | null }

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('interview_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (!session) notFound()

  const [
    { data: candidate },
    { data: jd },
    { data: questions },
    { data: challenges },
  ] = await Promise.all([
    supabase.from('candidates').select('*').eq('id', session.candidate_id).single(),
    session.jd_id ? supabase.from('job_descriptions').select('id, title, company').eq('id', session.jd_id).single() : Promise.resolve({ data: null }),
    supabase.from('session_questions').select('*').eq('session_id', id).order('order_index'),
    supabase.from('code_challenges').select('*').eq('session_id', id).order('created_at'),
  ])

  const typedCandidate = candidate as Candidate | null
  const typedJD = jd as JD | null
  const typedQuestions = (questions as SessionQuestion[]) ?? []
  const typedChallenges = (challenges as CodeChallenge[]) ?? []
  const firstChallenge = typedChallenges[0]

  const challengeLinks: ChallengeLink[] = []
  if (firstChallenge) {
    const { data: links } = await supabase
      .from('challenge_links')
      .select('*')
      .eq('challenge_id', firstChallenge.id)
      .order('created_at', { ascending: false })
    if (links) challengeLinks.push(...(links as ChallengeLink[]))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/sessions" className="text-sm text-slate-500 hover:text-sky-600">← Sessions</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {typedCandidate?.name ?? 'Session'}
          </h1>
          {typedJD && (
            <p className="text-slate-500 text-sm mt-1">
              {typedJD.title}{typedJD.company && ` @ ${typedJD.company}`}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={session.difficulty === 'senior' ? 'danger' : session.difficulty === 'junior' ? 'success' : 'warning'}>
              {session.difficulty}
            </Badge>
            <Badge variant={session.status === 'active' ? 'success' : session.status === 'completed' ? 'info' : 'default'}>
              {session.status}
            </Badge>
            <span className="text-xs text-slate-400">{formatDateShort(session.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Candidate details */}
      {typedCandidate && (
        <div className="card p-4">
          <h2 className="font-semibold text-slate-900 mb-3">Candidate</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div><span className="text-slate-500">Name:</span> {typedCandidate.name}</div>
            {typedCandidate.email && <div><span className="text-slate-500">Email:</span> {typedCandidate.email}</div>}
            {typedCandidate.years_exp && <div><span className="text-slate-500">Experience:</span> {typedCandidate.years_exp} years</div>}
            {typedCandidate.skills?.length > 0 && (
              <div className="col-span-2">
                <span className="text-slate-500">Skills:</span> {typedCandidate.skills.join(', ')}
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
                  <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${q.asked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`} />
                  <p className="text-sm text-slate-900 flex-1">{q.question}</p>
                  <span className="text-slate-400 text-xs group-open:rotate-180 transition-transform shrink-0">▼</span>
                </summary>
                <div className="px-11 pb-4 text-sm text-slate-600 whitespace-pre-wrap">{q.answer}</div>
              </details>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            No questions yet — they are added when you create a session with AI generation.
          </div>
        )}
      </div>

      {/* Code Challenge */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Code Challenge</h2>
        <ChallengeLinkGenerator
          sessionId={id}
          existingChallenge={
            firstChallenge
              ? {
                  id: firstChallenge.id,
                  title: firstChallenge.title,
                  links: challengeLinks.map((l) => ({
                    ...l,
                    url: `${appUrl}/challenge/${l.token}`,
                  })),
                }
              : undefined
          }
        />
      </div>
    </div>
  )
}
