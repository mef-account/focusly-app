'use client'

import { use } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BoardView } from '@/components/projects/BoardView'
import { ListView } from '@/components/projects/ListView'
import { TaskSheet } from '@/components/tasks/TaskSheet'
import { useProject } from '@/lib/queries/useProjects'
import { useTasks } from '@/lib/queries/useTasks'
import { useTimeTotalsByTask } from '@/lib/queries/useTimeEntries'
import { useNoteCountsByTask } from '@/lib/queries/useNotes'

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

  const view = (searchParams.get('view') ?? 'board') as 'board' | 'list'

  function setView(v: string) {
    router.replace(`/app/projects/${id}?view=${v}`)
  }

  const done = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

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
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
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
