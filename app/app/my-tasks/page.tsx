'use client'

import Link from 'next/link'
import { CheckSquare, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskSheet } from '@/components/tasks/TaskSheet'
import { AssigneePicker } from '@/components/tasks/AssigneePicker'
import { TaskTimerButton } from '@/components/tracker/TaskTimerButton'
import { useMyTasks, useUpdateTask } from '@/lib/queries/useTasks'
import { useTimeTotalsByTask } from '@/lib/queries/useTimeEntries'
import { useNoteCountsByTask } from '@/lib/queries/useNotes'
import { useTaskPanelStore } from '@/store/useTaskPanelStore'
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  formatDate,
  formatDuration,
  cn,
} from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

const GROUP_ORDER: TaskStatus[] = ['in_progress', 'todo', 'backlog']

function TaskRow({ task, loggedSeconds, noteCount }: { task: Task; loggedSeconds?: number; noteCount?: number }) {
  const { open } = useTaskPanelStore()
  const updateTask = useUpdateTask()

  return (
    <div
      onClick={() => open(task.id)}
      className="flex items-center gap-3 border-b px-3 py-2.5 last:border-0 hover:bg-accent/40 cursor-pointer transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {task.project && (
            <Link
              href={`/app/projects/${task.project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              {task.project.name}
            </Link>
          )}
          {task.priority !== 'none' && (
            <Badge className={cn('text-[10px] px-1.5 py-0', PRIORITY_CLASSES[task.priority])}>
              {PRIORITY_LABELS[task.priority]}
            </Badge>
          )}
          {!!noteCount && (
            <span
              className="flex items-center gap-0.5 text-[11px] text-muted-foreground"
              title={`${noteCount} note${noteCount === 1 ? '' : 's'}`}
            >
              <FileText className="h-3 w-3" />
              {noteCount}
            </span>
          )}
        </div>
      </div>

      {!!loggedSeconds && (
        <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
          {formatDuration(loggedSeconds)}
        </span>
      )}
      {task.due_date && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {formatDate(task.due_date)}
        </span>
      )}
      <TaskTimerButton task={task} />
      <AssigneePicker
        value={task.assignee_id}
        assignee={task.assignee}
        stopPropagation
        onChange={(id) => updateTask.mutate({ id: task.id, assignee_id: id })}
      />
    </div>
  )
}

export default function MyTasksPage() {
  const { data: tasks = [], isLoading } = useMyTasks()
  const { data: timeTotals = {} } = useTimeTotalsByTask(tasks.map((t) => t.id))
  const { data: noteCounts = {} } = useNoteCountsByTask(tasks.map((t) => t.id))

  const groups = GROUP_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">My Tasks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading ? 'Loading…' : `${tasks.length} active task${tasks.length === 1 ? '' : 's'} assigned to you.`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-20 text-center">
          <CheckSquare className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nothing assigned to you</p>
          <p className="text-sm text-muted-foreground">
            Assign yourself to a task from any board or list to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.status}>
              <div className="mb-1.5 flex items-center gap-2">
                <Badge className={cn('text-xs', STATUS_CLASSES[group.status])}>
                  {STATUS_LABELS[group.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">{group.items.length}</span>
              </div>
              <div className="rounded-xl border bg-card">
                {group.items.map((task) => (
                  <TaskRow key={task.id} task={task} loggedSeconds={timeTotals[task.id]} noteCount={noteCounts[task.id]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskSheet />
    </div>
  )
}
