'use client'

import { CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PriorityIcon } from '@/components/tasks/PriorityIcon'
import { useTasksDueThisWeek } from '@/lib/queries/useTasks'
import { taskDueDateLabel } from '@/lib/utils'

export function UpcomingWidget() {
  const { data: tasks, isLoading } = useTasksDueThisWeek()

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Upcoming (7 days)</h3>
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
      ) : !tasks?.length ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Clear week ahead ✨
        </p>
      ) : (
        <div className="space-y-1">
          {tasks.slice(0, 8).map((task) => {
            const { label } = taskDueDateLabel(task.due_date!)
            return (
              <div key={task.id} className="flex items-center justify-between gap-2 py-1">
                <span className="min-w-0 truncate text-sm">{task.title}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <PriorityIcon priority={task.priority} />
                </div>
              </div>
            )
          })}
          {tasks.length > 8 && (
            <p className="pt-1 text-xs text-muted-foreground">
              +{tasks.length - 8} more
            </p>
          )}
        </div>
      )}
    </div>
  )
}
