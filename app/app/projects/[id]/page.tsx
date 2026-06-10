'use client'

import { use, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, FileText, Maximize2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BoardView } from '@/components/projects/BoardView'
import { ListView } from '@/components/projects/ListView'
import { TaskSheet } from '@/components/tasks/TaskSheet'
import { useProject, useUpdateProject } from '@/lib/queries/useProjects'
import { useTasks } from '@/lib/queries/useTasks'
import { useTimeTotalsByTask } from '@/lib/queries/useTimeEntries'
import { useNoteCountsByTask, useNotesByProject, useCreateNote } from '@/lib/queries/useNotes'
import { useNotePanelStore } from '@/store/useNotePanelStore'
import { formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const { data: project, isLoading: projLoading } = useProject(id)
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(id)
  const { data: timeTotals = {} } = useTimeTotalsByTask(tasks.map((t) => t.id))
  const { data: noteCounts = {} } = useNoteCountsByTask(tasks.map((t) => t.id))
  const { data: projectNotes = [] } = useNotesByProject(id)
  const updateProject = useUpdateProject()
  const createNote = useCreateNote()
  const openNote = useNotePanelStore((s) => s.openNote)

  const view = (searchParams.get('view') ?? 'board') as 'board' | 'list'

  function setView(v: string) {
    router.replace(`/app/projects/${id}?view=${v}`)
  }

  const done = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // Local description state for optimistic editing
  const [description, setDescription] = useState<string>('')
  useEffect(() => {
    if (project) setDescription(project.description ?? '')
  }, [project])

  async function handleNewNote() {
    if (!project || createNote.isPending) return
    try {
      const note = await createNote.mutateAsync({
        project_id: id,
        task_id: null,
        title: project.name,
        content: '',
        tag: 'work',
      })
      openNote(note.id, { mode: 'edit' })
    } catch {
      // Error toast is shown by useCreateNote
    }
  }

  if (projLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
      </div>
    )
  }

  if (!project) {
    return <p className="text-muted-foreground">Project not found.</p>
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <h2 className="text-xl font-bold">{project.name}</h2>
        </div>

        {/* Editable description */}
        <Textarea
          placeholder="Add a description…"
          className="min-h-[60px] w-full resize-none border-0 p-0 shadow-none focus-visible:ring-0 text-sm text-foreground/80 placeholder:text-muted-foreground/50 bg-transparent"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            const trimmed = description.trim() || null
            if (trimmed !== (project.description ?? null)) {
              updateProject.mutate({ id, description: trimmed })
            }
          }}
        />

        {/* Notes — always visible below description */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Notes</span>
              {projectNotes.length > 0 && (
                <span className="text-xs text-muted-foreground">({projectNotes.length})</span>
              )}
            </div>
            <button
              onClick={handleNewNote}
              disabled={createNote.isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New note
            </button>
          </div>

          {projectNotes.length > 0 && (
            <div className="space-y-0.5">
              {projectNotes.map((note, i) => (
                <div
                  key={note.id}
                  onClick={() => openNote(note.id)}
                  className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors ${
                    i < projectNotes.length - 1 ? '' : ''
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{note.title || 'Untitled'}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(note.updated_at)}</span>
                  <button
                    title="Open full screen"
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); openNote(note.id, { fullscreen: true }) }}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: project.color }}
            />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {done}/{total} done ({pct}%)
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={view} onValueChange={setView} className="flex flex-1 flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="flex-1 overflow-x-auto pt-2">
          {tasksLoading ? (
            <div className="flex gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-64 rounded-xl shrink-0" />
              ))}
            </div>
          ) : (
            <BoardView tasks={tasks} projectId={id} timeTotals={timeTotals} noteCounts={noteCounts} />
          )}
        </TabsContent>

        <TabsContent value="list" className="pt-2">
          {tasksLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <ListView tasks={tasks} timeTotals={timeTotals} noteCounts={noteCounts} persistKey={`focusly:list-col-sizing:${id}`} />
          )}
        </TabsContent>

        <TabsContent value="timeline" className="pt-2">
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-20 text-center">
            <p className="font-medium">Timeline view</p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task detail sheet — rendered once, shared across views */}
      <TaskSheet />
    </div>
  )
}
