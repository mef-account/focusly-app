'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { marked } from 'marked'
import { Skeleton } from '@/components/ui/skeleton'
import { useEnsureTodayDailyNote } from '@/lib/queries/useNotes'

export function DailyNoteWidget() {
  const ensureToday = useEnsureTodayDailyNote()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [html, setHtml] = useState('')
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    ensureToday.mutate(undefined, {
      onSuccess: (note) => {
        setTitle(note.title)
        setContent(note.content)
      },
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!content) { setHtml(''); return }
    const result = marked.parse(content)
    if (typeof result === 'string') setHtml(result)
    else result.then(setHtml)
  }, [content])

  const isLoading = ensureToday.isPending && !content

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-semibold truncate">{title || 'Daily Note'}</span>
        <Link
          href="/app/notes"
          title="Open full daily notes"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Body — preview */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : html ? (
          <div
            className="prose prose-sm prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No note yet for today.</p>
        )}
      </div>
    </div>
  )
}
