'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LiveCodeState {
  code: string
  language: string
  lastUpdated: Date | null
}

export function useAdminCodeWatch(linkId: string) {
  const supabase = createClient()
  const [state, setState] = useState<LiveCodeState>({
    code: '',
    language: 'javascript',
    lastUpdated: null,
  })
  const [connected, setConnected] = useState(false)

  // Load initial state from DB (handles page refresh / late join)
  useEffect(() => {
    supabase
      .from('live_code_state')
      .select('code, language, updated_at')
      .eq('link_id', linkId)
      .single()
      .then(({ data }) => {
        if (data) {
          setState({
            code: data.code,
            language: data.language,
            lastUpdated: new Date(data.updated_at),
          })
        }
      })
  }, [linkId, supabase])

  // Subscribe to broadcast channel for live updates
  useEffect(() => {
    const channel = supabase
      .channel(`challenge:${linkId}`)
      .on('broadcast', { event: 'code_update' }, ({ payload }) => {
        setState({
          code: payload.code,
          language: payload.language,
          lastUpdated: new Date(),
        })
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [linkId, supabase])

  const takeSnapshot = useCallback(
    async (aiAnalysis?: object) => {
      const { data } = await supabase
        .from('live_code_state')
        .select('code, language')
        .eq('link_id', linkId)
        .single()

      if (!data) return null

      const { data: submission } = await supabase
        .from('challenge_submissions')
        .insert({
          link_id: linkId,
          language: data.language,
          code: data.code,
          is_snapshot: true,
          ai_analysis: aiAnalysis ?? null,
        })
        .select()
        .single()

      return submission
    },
    [linkId, supabase]
  )

  return { ...state, connected, takeSnapshot }
}
