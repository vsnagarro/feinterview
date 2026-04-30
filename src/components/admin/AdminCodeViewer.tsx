'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/Toast'
import { useAdminCodeWatch } from '@/lib/realtime/useAdminCodeWatch'
import { LANGUAGE_LABELS } from '@/types/app'
import type { CodeAnalysis } from '@/types/app'
import { formatDate } from '@/lib/utils'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface AdminCodeViewerProps {
  linkId: string
  problemStatement: string
  candidateName: string | null
}

export function AdminCodeViewer({ linkId, problemStatement, candidateName }: AdminCodeViewerProps) {
  const { code, language, lastUpdated, connected, takeSnapshot } = useAdminCodeWatch(linkId)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null)
  const [snapshotting, setSnapshotting] = useState(false)

  async function handleAnalyze() {
    if (!code.trim()) {
      toast('No code to analyze yet', 'info')
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ai/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, code, language, problemStatement }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data: CodeAnalysis = await res.json()
      setAnalysis(data)
      toast('Analysis complete', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSnapshot() {
    setSnapshotting(true)
    await takeSnapshot(analysis ?? undefined)
    setSnapshotting(false)
    toast('Snapshot saved', 'success')
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Editor panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900">Live Code</h2>
            {candidateName && <span className="text-sm text-slate-500">— {candidateName}</span>}
            <Badge variant="info">
              {LANGUAGE_LABELS[language as keyof typeof LANGUAGE_LABELS] ?? language}
            </Badge>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              <span className="text-xs text-slate-400">{connected ? 'Live' : 'Reconnecting…'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-slate-400">Updated {formatDate(lastUpdated)}</span>
            )}
            <Button size="sm" variant="secondary" loading={snapshotting} onClick={handleSnapshot}>
              Save snapshot
            </Button>
            <Button size="sm" loading={analyzing} onClick={handleAnalyze}>
              Analyze with AI
            </Button>
          </div>
        </div>
        <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden min-h-0" style={{ minHeight: '400px' }}>
          <MonacoEditor
            height="100%"
            language={language}
            value={code || '// Waiting for candidate to start typing…'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
            theme="vs-light"
          />
        </div>
      </div>

      {/* Analysis panel */}
      {analysis && (
        <div className="w-80 shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">AI Analysis</h2>
            <button onClick={() => setAnalysis(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <p className="text-sm font-medium text-slate-700 mb-1">Summary</p>
              <p className="text-sm text-slate-600">{analysis.summary}</p>
            </div>

            {analysis.strengths.length > 0 && (
              <div className="card p-4">
                <p className="text-sm font-medium text-emerald-700 mb-2">Strengths</p>
                <ul className="space-y-1">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-slate-600 flex gap-2">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.issues.length > 0 && (
              <div className="card p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Issues</p>
                <ul className="space-y-2">
                  {(analysis.issues as unknown as Array<{ severity: string; description: string }>).map((issue, i) => (
                    <li key={i} className="text-sm">
                      <Badge variant={issue.severity === 'critical' ? 'danger' : issue.severity === 'major' ? 'warning' : 'default'}>
                        {issue.severity}
                      </Badge>
                      <p className="text-slate-600 mt-1">{issue.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.followUpQuestions.length > 0 && (
              <div className="card p-4">
                <p className="text-sm font-medium text-sky-700 mb-2">Follow-up Questions</p>
                <ul className="space-y-2">
                  {analysis.followUpQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-slate-600 flex gap-2">
                      <span className="text-sky-400 shrink-0 font-bold">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {analyzing && (
        <div className="w-80 shrink-0 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="mx-auto mb-2" />
            <p className="text-sm text-slate-500">Analyzing code…</p>
          </div>
        </div>
      )}
    </div>
  )
}
