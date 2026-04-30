import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDateShort } from '@/lib/utils'

interface SessionRow { id: string; created_at: string; difficulty: string; status: string; candidate_id: string; jd_id: string | null }
interface CandidateRow { id: string; name: string }
interface JDRow { id: string; title: string; company: string | null }

export default async function SessionsPage() {
  const supabase = await createClient()

  const [{ data: sessions }, { data: candidates }, { data: jds }] = await Promise.all([
    supabase.from('interview_sessions').select('*').order('created_at', { ascending: false }),
    supabase.from('candidates').select('id, name'),
    supabase.from('job_descriptions').select('id, title, company'),
  ])

  const candidateMap = new Map<string, string>(
    (candidates as CandidateRow[] | null)?.map((c) => [c.id, c.name]) ?? []
  )
  const jdMap = new Map<string, JDRow>(
    (jds as JDRow[] | null)?.map((j) => [j.id, j]) ?? []
  )

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
            const candidateName = candidateMap.get(session.candidate_id) ?? 'Unknown'
            const jd = session.jd_id ? jdMap.get(session.jd_id) : null
            return (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="card flex items-center justify-between p-4 hover:shadow-md transition-shadow block"
              >
                <div>
                  <p className="font-medium text-slate-900">{candidateName}</p>
                  {jd && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {jd.title}{jd.company && ` @ ${jd.company}`}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{formatDateShort(session.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={session.difficulty === 'senior' ? 'danger' : session.difficulty === 'junior' ? 'success' : 'warning'}>
                    {session.difficulty}
                  </Badge>
                  <Badge variant={session.status === 'active' ? 'success' : session.status === 'completed' ? 'info' : 'default'}>
                    {session.status}
                  </Badge>
                </div>
              </Link>
            )
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
  )
}
