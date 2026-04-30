'use client'

import { LANGUAGE_LABELS } from '@/types/app'

interface LanguageSelectorProps {
  supportedLanguages: string[]
  value: string
  onChange: (lang: string) => void
}

export function LanguageSelector({ supportedLanguages, value, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {supportedLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            value === lang
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS] ?? lang}
        </button>
      ))}
    </div>
  )
}
