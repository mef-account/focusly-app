'use client'

import { useState } from 'react'
import { SlidersHorizontal, Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { ViewGroupBy } from '@/types'

export type SortField = 'priority' | 'due_date' | 'created_at' | 'title'
export type SortDir = 'asc' | 'desc'

export const ALL_COLUMNS = [
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
  { id: 'project', label: 'Project' },
  { id: 'due_date', label: 'Due date' },
  { id: 'created_at', label: 'Created date' },
  { id: 'estimate_minutes', label: 'Estimate' },
  { id: 'logged', label: 'Logged time' },
] as const

export type ColumnId = (typeof ALL_COLUMNS)[number]['id']

export interface DisplayOptions {
  groupBy: ViewGroupBy
  subGroupBy: ViewGroupBy
  sortField: SortField
  sortDir: SortDir
  visibleColumns: ColumnId[]
}

interface ViewDisplayPanelProps {
  options: DisplayOptions
  onChange: (options: DisplayOptions) => void
}

const GROUP_BY_OPTIONS: { value: ViewGroupBy; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'project', label: 'Project' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'due_date', label: 'Due date' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'workspace', label: 'Workspace' },
]

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'due_date', label: 'Due date' },
  { value: 'created_at', label: 'Created' },
  { value: 'title', label: 'Title' },
]

export function ViewDisplayPanel({ options, onChange }: ViewDisplayPanelProps) {
  const [open, setOpen] = useState(false)

  function setGroupBy(v: ViewGroupBy) {
    onChange({ ...options, groupBy: v })
  }

  function setSubGroupBy(v: ViewGroupBy) {
    onChange({ ...options, subGroupBy: v })
  }

  function setSortField(v: SortField) {
    onChange({ ...options, sortField: v })
  }

  function toggleSortDir() {
    onChange({ ...options, sortDir: options.sortDir === 'asc' ? 'desc' : 'asc' })
  }

  function toggleColumn(id: ColumnId) {
    const next = options.visibleColumns.includes(id)
      ? options.visibleColumns.filter((c) => c !== id)
      : [...options.visibleColumns, id]
    onChange({ ...options, visibleColumns: next })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 h-8 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors" />
        }
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Display
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0" sideOffset={6}>
        {/* Grouping */}
        <div className="px-3 py-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Grouping
          </p>
          <div className="flex flex-wrap gap-1">
            {GROUP_BY_OPTIONS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGroupBy(g.value)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:border-primary hover:text-primary',
                  options.groupBy === g.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground'
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Sub Grouping */}
        <div className="px-3 py-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sub Grouping
          </p>
          <div className="flex flex-wrap gap-1">
            {GROUP_BY_OPTIONS.map((g) => (
              <button
                key={g.value}
                onClick={() => setSubGroupBy(g.value)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:border-primary hover:text-primary',
                  options.subGroupBy === g.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground'
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Ordering */}
        <div className="px-3 py-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Ordering
          </p>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1 flex-1">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSortField(s.value)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:border-primary hover:text-primary',
                    options.sortField === s.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={toggleSortDir}
              className="shrink-0 rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {options.sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
        </div>

        <Separator />

        {/* Display properties */}
        <div className="px-3 py-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Display properties
          </p>
          <div className="flex flex-wrap gap-1">
            {ALL_COLUMNS.map((col) => {
              const active = options.visibleColumns.includes(col.id)
              return (
                <button
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                  )}
                >
                  {active && <Check className="h-2.5 w-2.5" />}
                  {col.label}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
