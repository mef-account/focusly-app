'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useEnsureTodayDailyNote, useUpdateNote } from '@/lib/queries/useNotes'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 800

export function DailyNoteWidget() {
  const ensureToday = useEnsureTodayDailyNote()
  const updateNote = useUpdateNote()

  const [noteId, setNoteId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    ensureToday.mutate(undefined, {
      onSuccess: (note) => {
        setNoteId(note.id)
        setTitle(note.title)
        setContent(note.content)
      },
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(
    (id: string, patch: { title?: string; content?: string }) => {
      setSaving(true)
      updateNote.mutate({ id, ...patch }, { onSettled: () => setSaving(false) })
    },
    [updateNote]
  )

  function handleChange(val: string) {
    setContent(val)
    if (!noteId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(noteId, { content: val, title }), DEBOUNCE_MS)
  }

  const isLoading = ensureToday.isPending && !noteId

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-semibold truncate">{title || 'Daily Note'}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {saving ? 'Saving…' : noteId ? 'Saved' : ''}
          </span>
          <Link
            href="/app/notes"
            title="Open full daily notes"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <textarea
            spellCheck
            className={cn(
              'flex-1 resize-none bg-transparent p-4 font-mono text-sm outline-none',
              'placeholder:text-muted-foreground'
            )}
            placeholder="Write your daily note…"
            value={content}
            onChange={(e) => handleChange(e.target.value)}
          />
        )}
      </div>
    </div>
  )
}
