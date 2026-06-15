'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 800
const NOTE_IMAGES_BUCKET = 'note-images'

async function uploadNoteImage(file: File): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from(NOTE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}

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
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
    }
  }, [noteId, note?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveNow = useCallback(
    (patch: { title?: string; content?: string }) => {
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
    debounceRef.current = setTimeout(() => saveNow({ content: val, title }), DEBOUNCE_MS)
  }

  function handleTitleBlur() {
    if (title !== note?.title) saveNow({ title })
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
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <input
          spellCheck
          className="h-8 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Untitled"
        />
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
        onImageUpload={uploadNoteImage}
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
