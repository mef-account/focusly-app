'use client'

import { useEffect } from 'react'
import { Play, Square, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTimerStore } from '@/store/useTimerStore'
import { useTaskTimer } from '@/lib/hooks/useTaskTimer'
import { formatDuration } from '@/lib/utils'
import { useProjects } from '@/lib/queries/useProjects'

export function TimerWidget() {
  const { running, seconds, description, projectId, start, tick } = useTimerStore()
  const { stopActive } = useTaskTimer()
  const { data: projects } = useProjects()

  const activeProject = projects?.find((p) => p.id === projectId)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [running, tick])

  return (
    <div className="flex h-full items-center justify-between rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Timer className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {formatDuration(running ? seconds : 0)}
          </p>
          {running && (
            <div className="mt-0.5 flex items-center gap-1.5">
              {activeProject && (
                <>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: activeProject.color }}
                  />
                  <span className="text-xs text-muted-foreground">{activeProject.name}</span>
                  {description && <span className="text-xs text-muted-foreground">/</span>}
                </>
              )}
              {description && (
                <span className="text-base font-medium text-foreground">
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant={running ? 'destructive' : 'default'}
          className="gap-1.5"
          onClick={running ? stopActive : start}
        >
          {running ? (
            <>
              <Square className="h-3.5 w-3.5" /> Stop
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> Start
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
