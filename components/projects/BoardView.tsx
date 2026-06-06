'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { Plus, Clock3, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdateTask, useCreateTask } from '@/lib/queries/useTasks'
import { useTaskPanelStore } from '@/store/useTaskPanelStore'
import { TaskTimerButton } from '@/components/tracker/TaskTimerButton'
import { AssigneePicker } from '@/components/tasks/AssigneePicker'
import { PRIORITY_CLASSES, PRIORITY_LABELS, formatDate, formatDuration, cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
]

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, overlay, loggedSeconds, noteCount }: { task: Task; overlay?: boolean; loggedSeconds?: number; noteCount?: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const { open } = useTaskPanelStore()
  const updateTask = useUpdateTask()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => open(task.id)}
      className={cn(
        'cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && !overlay && 'opacity-40',
        overlay && 'rotate-1 shadow-lg'
      )}
    >
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {task.priority !== 'none' && (
            <Badge className={cn('text-[10px] px-1.5 py-0', PRIORITY_CLASSES[task.priority])}>
              {PRIORITY_LABELS[task.priority]}
            </Badge>
          )}
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground">{formatDate(task.due_date)}</span>
          )}
          {!!loggedSeconds && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Time logged">
              <Clock3 className="h-2.5 w-2.5" />
              {formatDuration(loggedSeconds)}
            </span>
          )}
          {!!noteCount && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground" title={`${noteCount} note${noteCount === 1 ? '' : 's'}`}>
              <FileText className="h-2.5 w-2.5" />
              {noteCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <TaskTimerButton task={task} />
          <AssigneePicker
            value={task.assignee_id}
            assignee={task.assignee}
            stopPropagation
            onChange={(id) => updateTask.mutate({ id: task.id, assignee_id: id })}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  col,
  tasks,
  projectId,
  timeTotals,
  noteCounts,
}: {
  col: { id: TaskStatus; label: string }
  tasks: Task[]
  projectId: string
  timeTotals: Record<string, number>
  noteCounts: Record<string, number>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  const createTask = useCreateTask()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  async function handleAdd() {
    const title = newTitle.trim()
    if (!title || createTask.isPending) { setAdding(false); return }
    try {
      await createTask.mutateAsync({
        title,
        project_id: projectId,
        status: col.id,
        priority: 'none',
        description: null,
        parent_task_id: null,
        assignee_id: null,
        created_by: null,
        start_date: null,
        due_date: null,
        scheduled_start: null,
        estimate_minutes: null,
      })
      setNewTitle('')
      setAdding(false)
    } catch (err) {
      console.error('Failed to create task:', err)
      alert(`Could not create task: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{col.label}</span>
          <span className="text-xs text-muted-foreground">{tasks.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-col gap-2 rounded-xl p-2 transition-colors',
          isOver ? 'bg-accent/60' : 'bg-muted/40'
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} loggedSeconds={timeTotals[task.id]} noteCount={noteCounts[task.id]} />
          ))}
        </SortableContext>

        {adding ? (
          <div className="rounded-lg border bg-card p-2">
            <Input
              autoFocus
              className="h-7 text-sm"
              placeholder="Task title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') setAdding(false)
              }}
              onBlur={handleAdd}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Board View ───────────────────────────────────────────────────────────────

interface BoardViewProps {
  tasks: Task[]
  projectId: string
  timeTotals?: Record<string, number>
  noteCounts?: Record<string, number>
}

export function BoardView({ tasks, projectId, timeTotals = {}, noteCounts = {} }: BoardViewProps) {
  const updateTask = useUpdateTask()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const tasksByStatus = COLUMNS.reduce<Record<TaskStatus, Task[]>>(
    (acc, col) => {
      acc[col.id] = tasks.filter((t) => t.status === col.id)
      return acc
    },
    {} as Record<TaskStatus, Task[]>
  )

  function handleDragStart(event: DragStartEvent) {
    const t = tasks.find((t) => t.id === event.active.id)
    setActiveTask(t ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const newStatus = over.id as TaskStatus
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return

    updateTask.mutate({ id: task.id, status: newStatus })
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            col={col}
            tasks={tasksByStatus[col.id] ?? []}
            projectId={projectId}
            timeTotals={timeTotals}
            noteCounts={noteCounts}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} overlay />}
      </DragOverlay>
    </DndContext>
  )
}
