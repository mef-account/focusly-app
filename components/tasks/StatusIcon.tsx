import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types'

const STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: 'text-gray-400',
  todo: 'text-gray-400',
  in_progress: 'text-amber-500',
  done: 'text-green-500',
  cancelled: 'text-gray-400',
}

interface StatusIconProps {
  status: TaskStatus
  className?: string
}

/** Linear-style status glyphs rendered as inline SVGs (use currentColor). */
export function StatusIcon({ status, className }: StatusIconProps) {
  return (
    <span className={cn('inline-flex shrink-0', STATUS_COLOR[status], className)}>
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden="true">
        {status === 'backlog' && (
          <circle
            cx="7" cy="7" r="6" fill="none"
            stroke="currentColor" strokeWidth="2" strokeDasharray="2.4 2.4"
          />
        )}

        {status === 'todo' && (
          <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        )}

        {status === 'in_progress' && (
          <>
            <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M7 7 L7 3 A4 4 0 0 1 7 11 Z" fill="currentColor" />
          </>
        )}

        {status === 'done' && (
          <>
            <circle cx="7" cy="7" r="6" fill="currentColor" />
            <path
              d="M4.4 7.2 L6.2 9 L9.6 5.2"
              fill="none" stroke="white" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </>
        )}

        {status === 'cancelled' && (
          <>
            <circle cx="7" cy="7" r="6" fill="currentColor" />
            <path
              d="M4.8 4.8 L9.2 9.2 M9.2 4.8 L4.8 9.2"
              stroke="white" strokeWidth="1.6" strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </span>
  )
}
