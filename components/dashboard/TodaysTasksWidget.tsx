'use client'

import { CheckSquare, Circle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTasksDueToday } from '@/lib/queries/useTasks'
import { useUpdateTask } from '@/lib/queries/useTasks'
import { PRIORITY_CLASSES, PRIORITY_LABELS, cn } from '@/lib/utils'
import type { Task } from '@/types'

function TaskRow({ task }: { task: Task }) {
  const update = useUpdateTask()
  const isDone = task.status === 'done'

  return (
    <div className="flex items-start gap-3 py-2">
      <button
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
        onClick={() =>
          update.mutate({ id: task.id, status: isDone ? 'todo' : 'done' })
        }
      >
        {isDone ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
        <span className={cn('truncate text-sm', isDone && 'line-through text-muted-foreground')}>
          {task.title}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {task.project && (
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: task.project.color }}
            />
          )}
          <Badge
            variant="secondary"
            className={cn('text-[10px] px-1.5 py-0', PRIORITY_CLASSES[task.priority])}
          >
            {PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export function TodaysTasksWidget() {
  const { data: tasks, isLoading } = useTasksDueToday()

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Today&apos;s Tasks</h3>
        {tasks && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {tasks.filter((t) => t.status !== 'done').length} remaining
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : !tasks?.length ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nothing due today 🎉
        </p>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
