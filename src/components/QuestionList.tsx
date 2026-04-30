"use client"

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Question = {
  id: string
  category: string
  question: string
  ideal_answer?: string
  level?: string
}

export default function QuestionList() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from<Question>('questions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) console.error('fetch questions', error)
      if (mounted) setQuestions(data || [])
      if (mounted) setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <div>Loading questions…</div>
  if (!questions.length) return <div>No questions found.</div>

  return (
    <div className="space-y-3">
      {questions.map((q) => (
        <div key={q.id} className="p-3 border rounded">
          <div className="text-sm text-slate-500">{q.category} • {q.level}</div>
          <div className="font-medium">{q.question}</div>
          {q.ideal_answer && <pre className="mt-2 text-sm bg-slate-50 p-2 rounded">{q.ideal_answer}</pre>}
        </div>
      ))}
    </div>
  )
}
