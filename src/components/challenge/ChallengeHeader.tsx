'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { timeUntil } from '@/lib/utils'

interface ChallengeHeaderProps {
  title: string
  problemStatement: string
  timeLimitMinutes: number | null
  expiresAt: string
}

export function ChallengeHeader({ title, problemStatement, timeLimitMinutes, expiresAt }: ChallengeHeaderProps) {
  const [timeLeft, setTimeLeft] = useState(timeUntil(expiresAt))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(timeUntil(expiresAt))
    }, 30_000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-start justify-between gap-4 max-w-5xl mx-auto">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          <div className="mt-2 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
            {problemStatement}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {timeLimitMinutes && (
            <Badge variant="warning">{timeLimitMinutes}m limit</Badge>
          )}
          <Badge variant={timeLeft === 'Expired' ? 'danger' : 'info'}>
            Link expires: {timeLeft}
          </Badge>
        </div>
      </div>
    </div>
  )
}
