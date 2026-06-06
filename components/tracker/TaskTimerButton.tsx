'use client'

import { Play, Square } from 'lucide-react'
import { useTimerStore } from '@/store/useTimerStore'
import { useTaskTimer } from '@/lib/hooks/useTaskTimer'
import { formatDuration, cn } from '@/lib/utils'

interface TaskTimerButtonProps {
  task: { id: string; title: string; project_id?: string | null }
  variant?: 'icon' | 'full'
  className?: string
}

export function TaskTimerButton({ task, variant = 'icon', className }: TaskTimerButtonProps) {
  const { toggle } = useTaskTimer()
  const running = useTimerStore((s) => s.running)
  const activeTaskId = useTimerStore((s) => s.taskId)
  const seconds = useTimerStore((s) => s.seconds)

  const isRunning = running && activeTaskId === task.id

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    toggle(task)
  }

  if (variant === 'full') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isRunning
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-primary/10 text-primary hover:bg-primary/20',
          className
        )}
      >
        {isRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {isRunning ? (
          <span className="font-mono tabular-nums">{formatDuration(seconds)}</span>
        ) : (
          'Start timer'
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      title={isRunning ? 'Stop timer' : 'Start timer'}
      className={cn(
        'flex h-6 items-center gap-1 rounded px-1.5 transition-colors',
        isRunning
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        className
      )}
    >
      {isRunning ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      {isRunning && (
        <span className="font-mono text-[10px] tabular-nums">{formatDuration(seconds)}</span>
      )}
    </button>
  )
}
