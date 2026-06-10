'use client'

import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PriorityIcon } from '@/components/tasks/PriorityIcon'
import { useTasksDueTomorrow } from '@/lib/queries/useTasks'
import { taskDueDateLabel, formatMinutes, sortTasksByPriority } from '@/lib/utils'

const DEFAULT_DUR = 30

export function UpcomingWidget() {
  const { data: tasks, isLoading } = useTasksDueTomorrow()

  const sortedTasks = useMemo(
    () => (tasks ? sortTasksByPriority(tasks) : []),
    [tasks]
  )

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Tomorrow</h3>
        {tasks && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {tasks.length}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : !sortedTasks.length ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nothing due tomorrow ✨
        </p>
      ) : (
        <div className="space-y-1">
          {sortedTasks.map((task) => {
            const { label } = taskDueDateLabel(task.due_date!)
            return (
              <div key={task.id} className="flex items-center gap-2 py-1">
                <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatMinutes(task.estimate_minutes ?? DEFAULT_DUR)}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <PriorityIcon priority={task.priority} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
