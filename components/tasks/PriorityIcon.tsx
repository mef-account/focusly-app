import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types'

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
  none: 'text-gray-400',
}

interface PriorityIconProps {
  priority: TaskPriority
  className?: string
}

/** Linear-style priority glyphs (bar charts / urgent flag). Uses currentColor. */
export function PriorityIcon({ priority, className }: PriorityIconProps) {
  return (
    <span className={cn('inline-flex shrink-0', PRIORITY_COLOR[priority], className)}>
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden="true">
        {priority === 'none' && (
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="2" y1="7" x2="3.8" y2="7" />
            <line x1="6.1" y1="7" x2="7.9" y2="7" />
            <line x1="10.2" y1="7" x2="12" y2="7" />
          </g>
        )}

        {priority === 'urgent' && (
          <>
            <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" fill="currentColor" />
            <rect x="6.3" y="3.6" width="1.4" height="4.4" rx="0.7" fill="white" />
            <circle cx="7" cy="10.2" r="0.9" fill="white" />
          </>
        )}

        {priority !== 'none' && priority !== 'urgent' && (
          <g fill="currentColor">
            {/* bar 1 (always lit for low/medium/high) */}
            <rect x="2" y="8" width="2.5" height="4" rx="0.8" />
            {/* bar 2 (lit for medium/high) */}
            <rect
              x="5.75" y="5" width="2.5" height="7" rx="0.8"
              opacity={priority === 'low' ? 0.25 : 1}
            />
            {/* bar 3 (lit for high only) */}
            <rect
              x="9.5" y="2" width="2.5" height="10" rx="0.8"
              opacity={priority === 'high' ? 1 : 0.25}
            />
          </g>
        )}
      </svg>
    </span>
  )
}
