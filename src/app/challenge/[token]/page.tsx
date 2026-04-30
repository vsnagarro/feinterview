import { ChallengeHeader } from '@/components/challenge/ChallengeHeader'
import { CandidateEditor } from '@/components/challenge/CandidateEditor'

interface ChallengeData {
  valid: boolean
  reason?: string
  linkId: string
  title: string
  problemStatement: string
  starterCode: string | null
  supportedLanguages: string[]
  timeLimitMinutes: number | null
  expiresAt: string
  candidateName: string | null
}

async function getChallengeData(token: string): Promise<ChallengeData | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${appUrl}/api/challenge-links/${token}`, {
      cache: 'no-store',
    })
    const data = await res.json()
    return data
  } catch {
    return null
  }
}

export default async function ChallengePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getChallengeData(token)

  if (!data || !data.valid) {
    const reason = data?.reason
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">
            {reason === 'expired' ? 'Link Expired' : reason === 'inactive' ? 'Link Deactivated' : 'Link Not Found'}
          </h1>
          <p className="text-slate-400 text-sm">
            {reason === 'expired'
              ? 'This challenge link has expired. Contact your interviewer for a new link.'
              : reason === 'inactive'
              ? 'This link has been deactivated by the interviewer.'
              : 'This link does not exist. Please check the URL.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <div className="bg-white">
        <div className="flex items-center justify-between px-6 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-white font-semibold text-sm">FE Interview — Code Challenge</span>
          {data.candidateName && (
            <span className="text-slate-400 text-xs">{data.candidateName}</span>
          )}
        </div>
        <ChallengeHeader
          title={data.title}
          problemStatement={data.problemStatement}
          timeLimitMinutes={data.timeLimitMinutes}
          expiresAt={data.expiresAt}
        />
      </div>
      <div className="flex-1 min-h-0">
        <CandidateEditor
          linkId={data.linkId}
          starterCode={data.starterCode}
          supportedLanguages={data.supportedLanguages}
        />
      </div>
    </div>
  )
}
