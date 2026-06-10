'use client'

import { useMemo } from 'react'
import { CheckSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PriorityIcon } from '@/components/tasks/PriorityIcon'
import { useTasksDueToday } from '@/lib/queries/useTasks'
import { taskDueDateLabel, sortTasksByPriority, formatMinutes } from '@/lib/utils'
import type { Task } from '@/types'

const DEFAULT_DUR = 30

function TaskRow({ task }: { task: Task }) {
  const dueLabel = task.due_date ? taskDueDateLabel(task.due_date) : null

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatMinutes(task.estimate_minutes ?? DEFAULT_DUR)}
      </span>

      {dueLabel && (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{dueLabel.label}</span>
          <PriorityIcon priority={task.priority} />
        </div>
      )}
    </div>
  )
}

export function TodaysTasksWidget() {
  const { data: tasks, isLoading } = useTasksDueToday()

  const sortedTasks = useMemo(
    () => (tasks ? sortTasksByPriority(tasks) : []),
    [tasks]
  )

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Today&apos;s Tasks</h3>
        {tasks && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {tasks.filter((t) => t.status !== 'done').length}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : !sortedTasks.length ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nothing due today 🎉
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {sortedTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
