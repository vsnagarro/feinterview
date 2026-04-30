'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/Toast'
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '@/types/app'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

type Snippet = Database['public']['Tables']['code_snippets']['Row']

interface SnippetsListProps {
  initialSnippets: Snippet[]
}

export function SnippetsList({ initialSnippets }: SnippetsListProps) {
  const supabase = createClient()
  const [snippets, setSnippets] = useState(initialSnippets)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    language: 'javascript',
    code: '// Write your code here\n',
    explanation: '',
    difficulty: 'mid' as Snippet['difficulty'],
    tags: '',
  })

  const filtered = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.language.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('code_snippets')
      .insert({
        title: form.title,
        description: form.description || null,
        language: form.language,
        code: form.code,
        explanation: form.explanation || null,
        difficulty: form.difficulty,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        source: 'manual',
      })
      .select()
      .single()

    setSaving(false)
    if (error) {
      toast('Failed to add snippet', 'error')
    } else {
      setSnippets((prev) => [data, ...prev])
      setForm({ title: '', description: '', language: 'javascript', code: '// Write your code here\n', explanation: '', difficulty: 'mid', tags: '' })
      setShowAdd(false)
      toast('Snippet added', 'success')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Input
          placeholder="Search snippets, languages, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-slate-400 ml-auto">{filtered.length} snippets</span>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add snippet'}
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card p-5 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Debounce implementation"
              required
            />
            <Select
              label="Language"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }))}
            />
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="What does this snippet demonstrate?"
          />
          <div>
            <label className="label mb-1 block">Code</label>
            <div className="border border-slate-300 rounded-lg overflow-hidden h-48">
              <MonacoEditor
                language={form.language}
                value={form.code}
                onChange={(v) => setForm({ ...form, code: v ?? '' })}
                options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 13 }}
                theme="vs-light"
              />
            </div>
          </div>
          <Textarea
            label="Explanation"
            value={form.explanation}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            rows={3}
            placeholder="What does this code demonstrate and why does it matter?"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Difficulty"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as Snippet['difficulty'] })}
              options={[
                { value: 'junior', label: 'Junior' },
                { value: 'mid', label: 'Mid' },
                { value: 'senior', label: 'Senior' },
              ]}
            />
            <Input
              label="Tags (comma-separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="closures, async, performance"
            />
          </div>
          <Button type="submit" loading={saving}>Save snippet</Button>
        </form>
      )}

      <div className="space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="card overflow-hidden">
            <button
              className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{s.title}</p>
                {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="info">{s.language}</Badge>
                <Badge variant={s.difficulty === 'senior' ? 'danger' : s.difficulty === 'junior' ? 'success' : 'warning'}>
                  {s.difficulty}
                </Badge>
              </div>
            </button>
            {expanded === s.id && (
              <div className="border-t border-slate-100">
                <div className="h-48">
                  <MonacoEditor
                    language={s.language}
                    value={s.code}
                    options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 13 }}
                    theme="vs-light"
                  />
                </div>
                {s.explanation && (
                  <div className="px-4 py-3 text-sm text-slate-600 bg-slate-50">{s.explanation}</div>
                )}
                {s.tags.length > 0 && (
                  <div className="px-4 pb-3 flex gap-1 flex-wrap">
                    {s.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            {search ? 'No matching snippets' : 'No snippets yet'}
          </div>
        )}
      </div>
    </div>
  )
}
