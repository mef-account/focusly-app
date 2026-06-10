'use client'

import { useMemo } from 'react'
import { Clock, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { useTasks } from '@/lib/queries/useTasks'
import { useTimeEntriesToday } from '@/lib/queries/useTimeEntries'
import { formatDuration } from '@/lib/utils'

const DEFAULT_DUR = 30 // same default as planner

function formatMinutes(mins: number) {
  if (mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function DailyProgressWidget() {
  const { data: allTasks, isLoading: loadingTasks } = useTasks()
  const { data: entries, isLoading: loadingEntries } = useTimeEntriesToday()

  const todayTasks = useMemo(() => {
    if (!allTasks) return []
    const today = format(new Date(), 'yyyy-MM-dd')
    return allTasks.filter(
      (t) => t.status !== 'cancelled' && t.due_date === today
    )
  }, [allTasks])

  const totalEstMins = todayTasks.reduce(
    (sum, t) => sum + (t.estimate_minutes ?? DEFAULT_DUR),
    0
  )
  const totalLogSecs = (entries ?? []).reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0)

  const isLoading = loadingTasks || loadingEntries

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Today&apos;s Progress</h3>
      </div>

      {isLoading ? (
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Estimated */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Estimated</p>
              <p className="font-mono text-2xl font-bold tabular-nums">
                {formatMinutes(totalEstMins)}
              </p>
            </div>
          </div>

          <div className="h-10 w-px bg-border" />

          {/* Logged */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Clock className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Logged</p>
              <p className="font-mono text-2xl font-bold tabular-nums">
                {totalLogSecs > 0 ? formatDuration(totalLogSecs) : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
