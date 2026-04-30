'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastFn: ((message: string, type?: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'info') {
  toastFn?.(message, type)
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    toastFn = addToast
    return () => { toastFn = null }
  }, [addToast])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'rounded-lg px-4 py-3 text-sm text-white shadow-lg max-w-sm',
            {
              'bg-emerald-600': t.type === 'success',
              'bg-red-600': t.type === 'error',
              'bg-slate-800': t.type === 'info',
            }
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
