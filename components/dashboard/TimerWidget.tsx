'use client'

import { useEffect } from 'react'
import { Play, Square, RotateCcw, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTimerStore } from '@/store/useTimerStore'
import { formatDuration } from '@/lib/utils'

export function TimerWidget() {
  const { running, seconds, start, stop, reset, tick } = useTimerStore()

  useEffect(() => {
    if (!running) return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [running, tick])

  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Timer className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Time tracked today</p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {formatDuration(seconds)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {seconds > 0 && !running && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant={running ? 'destructive' : 'default'}
          className="gap-1.5"
          onClick={running ? stop : start}
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
