'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LanguageSelector } from './LanguageSelector'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { useCodeSync } from '@/lib/realtime/useCodeSync'
import { createClient } from '@/lib/supabase/client'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface CandidateEditorProps {
  linkId: string
  starterCode: string | null
  supportedLanguages: string[]
}

export function CandidateEditor({ linkId, starterCode, supportedLanguages }: CandidateEditorProps) {
  const firstLang = supportedLanguages[0] ?? 'javascript'
  const [language, setLanguage] = useState(firstLang)
  const [code, setCode] = useState(starterCode ?? `// Write your solution here\n`)
  const [connected, setConnected] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { syncCode } = useCodeSync({
    linkId,
    onConnected: () => setConnected(true),
  })

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value ?? ''
      setCode(newCode)
      syncCode(newCode, language)
    },
    [syncCode, language]
  )

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang)
      syncCode(code, lang)
    },
    [code, syncCode]
  )

  async function handleSubmit() {
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from('challenge_submissions').insert({
      link_id: linkId,
      language,
      code,
      is_snapshot: false,
    })
    setSubmitting(false)
    if (error) {
      toast('Failed to submit. Please try again.', 'error')
    } else {
      setSubmitted(true)
      toast('Code submitted successfully!', 'success')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
        <LanguageSelector
          supportedLanguages={supportedLanguages}
          value={language}
          onChange={handleLanguageChange}
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className="text-xs text-slate-400">{connected ? 'Live' : 'Connecting…'}</span>
          </div>
          {submitted ? (
            <Badge variant="success">Submitted</Badge>
          ) : (
            <Button size="sm" onClick={handleSubmit} loading={submitting} disabled={!connected}>
              Submit
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
          }}
        />
      </div>
    </div>
  )
}
