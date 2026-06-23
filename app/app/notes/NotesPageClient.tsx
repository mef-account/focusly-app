'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useDailyNotes, useEnsureTodayDailyNote, useUpdateNote, useDeleteNote } from '@/lib/queries/useNotes'
import { uploadNoteImage } from '@/lib/uploadNoteImage'
import { format } from 'date-fns'

const DEBOUNCE_MS = 800

export function NotesPageClient() {
  const { data: notes } = useDailyNotes()
  const ensureToday = useEnsureTodayDailyNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ensuredTodayRef = useRef(false)
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const activeNote = notes?.find((n) => n.id === activeId) ?? null

  // Ensure today's daily note exists only if missing from loaded list
  useEffect(() => {
    if (!notes || ensuredTodayRef.current) return
    const todayNote = notes.find((n) => n.note_date === todayStr)
    if (todayNote) {
      setActiveId((prev) => prev ?? todayNote.id)
      return
    }
    ensuredTodayRef.current = true
    ensureToday.mutate(undefined, {
      onSuccess: (note) => setActiveId((prev) => prev ?? note.id),
    })
  }, [notes, todayStr, ensureToday])

  // Load note into local state when selection changes
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title)
      setContent(activeNote.content)
    }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select today's note once the list loads
  useEffect(() => {
    if (!notes?.length || activeId) return
    const todayNote = notes.find((n) => n.note_date === todayStr)
    setActiveId(todayNote?.id ?? notes[0].id)
  }, [notes, activeId, todayStr])

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
      { id: activeId, title, content },
      { onSettled: () => setSaving(false) }
    )
  }, [activeId, title, content, updateNote])

  function handleContentChange(val: string) {
    setContent(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (activeId) {
        setSaving(true)
        updateNote.mutate(
          { id: activeId, content: val, title },
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

  async function handleDelete() {
    if (!activeId) return
    deleteNote.mutate(activeId)
    setActiveId(null)
    setDeleteOpen(false)
    // Recreate today's note if the deleted one was today
    if (activeNote?.note_date === todayStr) {
      ensureToday.mutate(undefined, {
        onSuccess: (note) => setActiveId(note.id),
      })
    }
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="w-64 shrink-0">
        <NotesList activeId={activeId} onSelect={setActiveId} />
      </div>

      {activeNote ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <Input
              spellCheck
              className="h-8 flex-1 border-0 bg-transparent p-0 text-base font-semibold shadow-none focus-visible:ring-0"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Untitled"
            />
            <span className="min-w-[60px] text-right text-[10px] text-muted-foreground">
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

          <MarkdownEditor
            value={content}
            onChange={handleContentChange}
            className="flex-1 overflow-hidden"
            onImageUpload={uploadNoteImage}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">Loading daily note…</p>
        </div>
      )}

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
