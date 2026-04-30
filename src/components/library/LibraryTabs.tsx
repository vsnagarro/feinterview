'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface LibraryTabsProps {
  questionsTab: React.ReactNode
  snippetsTab: React.ReactNode
}

export function LibraryTabs({ questionsTab, snippetsTab }: LibraryTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [active, setActive] = useState<'questions' | 'snippets'>(
    searchParams.get('tab') === 'snippets' ? 'snippets' : 'questions'
  )

  function handleTab(tab: 'questions' | 'snippets') {
    setActive(tab)
    router.replace(tab === 'snippets' ? '/library?tab=snippets' : '/library', { scroll: false })
  }

  return (
    <div>
      <div className="flex border-b border-slate-200 mb-6">
        {(['questions', 'snippets'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTab(tab)}
            className={cn(
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors capitalize',
              active === tab
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'questions' ? 'Questions & Answers' : 'Code Snippets'}
          </button>
        ))}
      </div>
      {active === 'questions' ? questionsTab : snippetsTab}
    </div>
  )
}
