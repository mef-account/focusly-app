'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useDailyNotes } from '@/lib/queries/useNotes'
import { formatDate } from '@/lib/utils'

export function RecentNotesWidget() {
  const { data: notes, isLoading } = useDailyNotes()
  const recent = notes?.slice(0, 3)

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Recent Daily Notes</h3>
        <Link
          href="/app/notes"
          className="ml-auto text-xs text-muted-foreground hover:text-primary"
        >
          View all →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !recent?.length ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No daily notes yet
        </p>
      ) : (
        <div className="space-y-1">
          {recent.map((note) => (
            <Link
              key={note.id}
              href="/app/notes"
              className="flex items-start justify-between gap-2 rounded-lg px-2 py-2 hover:bg-accent transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{note.title || 'Untitled'}</p>
                {note.content && (
                  <p className="truncate text-xs text-muted-foreground">
                    {note.content.replace(/[#*`_~\[\]]/g, '').slice(0, 60)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatDate(note.note_date ?? note.updated_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
