"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabaseClient'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

type Submission = { id: string; code: string; language: string; created_at: string }

type Challenge = {
  id?: string
  allowed_langs?: string[]
  title?: string
  starterCode?: string | null
  problemStatement?: string
  timeLimitMinutes?: number | null
  expiresAt?: string
  linkId?: string
  candidateName?: string | null
}

type Props = { token: string }

export default function ChallengeClient({ token }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [code, setCode] = useState('// Happy coding')
  const [language, setLanguage] = useState('javascript')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('share_token', token)
        .limit(1)

      if (error) console.error(error)
      if (!mounted) return
      let ch: Challenge | null = null
      if (data && Array.isArray(data) && data.length) {
        ch = data[0] as unknown as Challenge
      }
      setChallenge(ch)
      setLoading(false)
      if (ch && ch.id) {
        // fetch past submissions
        const { data: subs } = await supabase
          .from('submissions')
          .select('*')
          .eq('challenge_id', ch.id)
          .order('created_at', { ascending: true })
        setSubmissions((subs as unknown as Submission[]) || [])
      }
    })()

    return () => { mounted = false }
  }, [token])

  useEffect(() => {
    if (!challenge?.id) return
    const channel = supabase
      .channel(`challenge-${challenge.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions', filter: `challenge_id=eq.${challenge.id}` }, (payload) => {
        setSubmissions((s) => [...s, payload.new as Submission])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [challenge?.id])

  const handleSubmit = async () => {
    if (!challenge?.id) return alert('invalid challenge')
    const { error } = await supabase.from('submissions').insert({ challenge_id: challenge.id, code, language })
    if (error) return alert('submit error: ' + error.message)
    alert('submitted')
  }

  if (loading) return <div>Loading challenge…</div>
  if (!challenge) return <div>Challenge not found or expired.</div>

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500">Challenge token: {token}</div>
      <div>
        <label className="block text-sm">Language</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 p-2 border rounded">
          {(challenge.allowed_langs || ['javascript']).map((l: string) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <div style={{ height: 360 }}>
        <MonacoEditor height="100%" defaultLanguage={language} defaultValue={code} onChange={(v) => setCode(v || '')} />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSubmit} className="px-3 py-2 bg-blue-600 text-white rounded">Submit</button>
      </div>

      <div>
        <h3 className="text-sm font-medium">Submissions</h3>
        <div className="space-y-2 mt-2">
          {submissions.map((s) => (
            <div key={s.id} className="p-2 border rounded">
              <div className="text-xs text-slate-500">{new Date(s.created_at).toLocaleString()} • {s.language}</div>
              <pre className="mt-1 text-sm bg-slate-50 p-2 rounded max-h-40 overflow-auto">{s.code}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
