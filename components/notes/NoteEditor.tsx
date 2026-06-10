'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MarkdownEditor } from '@/components/notes/MarkdownEditor'
import { useNote, useUpdateNote, useDeleteNote } from '@/lib/queries/useNotes'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'

const DEBOUNCE_MS = 800

type ViewMode = 'edit' | 'split' | 'preview'

interface NoteEditorProps {
  noteId: string
  defaultMode?: ViewMode
  /** Extra buttons rendered in the header (e.g. a fullscreen toggle). */
  actions?: React.ReactNode
  onDeleted?: () => void
  className?: string
}

export function NoteEditor({ noteId, defaultMode = 'split', actions, onDeleted, className }: NoteEditorProps) {
  const { data: note } = useNote(noteId)
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tag, setTag] = useState<Tag>('personal')
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTag(note.tag)
    }
  }, [noteId, note?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveNow = useCallback(
    (patch: { title?: string; content?: string; tag?: Tag }) => {
      setSaving(true)
      updateNote.mutate(
        { id: noteId, ...patch },
        { onSettled: () => setSaving(false) }
      )
    },
    [noteId, updateNote]
  )

  function handleContentChange(val: string) {
    setContent(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveNow({ content: val, title, tag }), DEBOUNCE_MS)
  }

  function handleTitleBlur() {
    if (title !== note?.title) saveNow({ title })
  }

  function cycleTag() {
    const next: Tag = tag === 'personal' ? 'work' : 'personal'
    setTag(next)
    saveNow({ tag: next })
  }

  function handleDelete() {
    deleteNote.mutate(noteId)
    setDeleteOpen(false)
    onDeleted?.()
  }

  if (!note) {
    return (
      <div className={cn('flex flex-1 items-center justify-center text-sm text-muted-foreground', className)}>
        Loading note…
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <input
          spellCheck
          className="h-8 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Untitled"
        />
        <Badge
          className={cn(
            'cursor-pointer select-none text-xs capitalize transition-colors',
            tag === 'work'
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          )}
          onClick={cycleTag}
        >
          {tag}
        </Badge>
        <span className="min-w-[52px] text-right text-[10px] text-muted-foreground">
          {saving ? 'Saving…' : 'Saved'}
        </span>
        {actions}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <MarkdownEditor
        value={content}
        onChange={handleContentChange}
        defaultMode={defaultMode}
        className="min-h-0 flex-1 overflow-hidden"
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{note.title || 'Untitled'}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
