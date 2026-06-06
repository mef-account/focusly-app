'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { NotesList } from '@/components/notes/NotesList'
import { MarkdownEditor } from '@/components/notes/MarkdownEditor'
import { useNotes, useUpdateNote, useDeleteNote } from '@/lib/queries/useNotes'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'

const DEBOUNCE_MS = 800

export default function NotesPage() {
  const { data: notes } = useNotes()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tag, setTag] = useState<Tag>('personal')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeNote = notes?.find((n) => n.id === activeId) ?? null

  // Load note into local state when selection changes
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title)
      setContent(activeNote.content)
      setTag(activeNote.tag)
    }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Select first note on mount
  useEffect(() => {
    if (notes?.length && !activeId) {
      setActiveId(notes[0].id)
    }
  }, [notes, activeId])

  // Ctrl+S save shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (activeId) saveNow()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })

  const saveNow = useCallback(() => {
    if (!activeId) return
    setSaving(true)
    updateNote.mutate(
      { id: activeId, title, content, tag },
      { onSettled: () => setSaving(false) }
    )
  }, [activeId, title, content, tag, updateNote])

  // Auto-save on content change (debounced)
  function handleContentChange(val: string) {
    setContent(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (activeId) {
        setSaving(true)
        updateNote.mutate(
          { id: activeId, content: val, title, tag },
          { onSettled: () => setSaving(false) }
        )
      }
    }, DEBOUNCE_MS)
  }

  function handleTitleBlur() {
    if (activeId && title !== activeNote?.title) {
      updateNote.mutate({ id: activeId, title })
    }
  }

  function cycleTag() {
    const next: Tag = tag === 'personal' ? 'work' : 'personal'
    setTag(next)
    if (activeId) updateNote.mutate({ id: activeId, tag: next })
  }

  async function handleDelete() {
    if (!activeId) return
    deleteNote.mutate(activeId)
    setActiveId(null)
    setDeleteOpen(false)
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <NotesList activeId={activeId} onSelect={setActiveId} />
      </div>

      {/* Editor */}
      {activeNote ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Note top bar */}
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <Input
              className="h-8 border-0 bg-transparent p-0 text-base font-semibold shadow-none focus-visible:ring-0 flex-1"
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
            <span className="text-[10px] text-muted-foreground min-w-[60px] text-right">
              {saving ? 'Saving…' : 'Saved'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Markdown editor */}
          <MarkdownEditor
            value={content}
            onChange={handleContentChange}
            className="flex-1 overflow-hidden"
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">No note selected</p>
          <p className="text-sm text-muted-foreground">
            Pick a note from the sidebar or create a new one
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{activeNote?.title || 'Untitled'}&rdquo; will be permanently deleted.
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
