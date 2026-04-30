import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { LibraryTabs } from '@/components/library/LibraryTabs'
import { QuestionsList } from '@/components/library/QuestionsList'
import { SnippetsList } from '@/components/library/SnippetsList'
import { Spinner } from '@/components/ui/Spinner'

export default async function LibraryPage() {
  const supabase = await createClient()

  const [{ data: questions }, { data: snippets }] = await Promise.all([
    supabase.from('questions').select('*').order('created_at', { ascending: false }),
    supabase.from('code_snippets').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Question Library</h1>
        <p className="text-slate-500 text-sm mt-1">All questions and code snippets — manually added or AI-generated</p>
      </div>
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
        <LibraryTabs
          questionsTab={<QuestionsList initialQuestions={questions ?? []} />}
          snippetsTab={<SnippetsList initialSnippets={snippets ?? []} />}
        />
      </Suspense>
    </div>
  )
}
