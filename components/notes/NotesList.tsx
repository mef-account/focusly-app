'use client'

import { useState } from 'react'
import { Search, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDailyNotes } from '@/lib/queries/useNotes'
import { formatDate, cn } from '@/lib/utils'
import type { Note } from '@/types'

interface NotesListProps {
  activeId: string | null
  onSelect: (id: string) => void
}

export function NotesList({ activeId, onSelect }: NotesListProps) {
  const { data: notes, isLoading } = useDailyNotes()
  const [search, setSearch] = useState('')

  const filtered = notes?.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      (n.note_date ?? '').includes(search)
  )

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Daily</span>
      </div>

      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 pl-7 text-xs"
            placeholder="Search daily notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : !filtered?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              {search ? 'No notes match your search' : 'No daily notes yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {filtered.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                active={note.id === activeId}
                onClick={() => onSelect(note.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NoteItem({
  note,
  active,
  onClick,
}: {
  note: Note
  active: boolean
  onClick: () => void
}) {
  const preview = note.content
    .replace(/[#*`_~\[\]>]/g, '')
    .trim()
    .slice(0, 80)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg px-3 py-2 text-left transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/50'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-sm font-medium">
          {note.title || formatDate(note.note_date) || 'Untitled'}
        </span>
        {note.note_date && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatDate(note.note_date)}
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {preview || 'Empty note'}
      </p>
    </button>
  )
}
