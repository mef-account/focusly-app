'use client'

import { useState } from 'react'
import { Filter, X, Plus, ChevronDown } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatusIcon } from '@/components/tasks/StatusIcon'
import { PriorityIcon } from '@/components/tasks/PriorityIcon'
import { STATUS_LABELS, PRIORITY_LABELS, cn } from '@/lib/utils'
import type { TaskStatus, TaskPriority, Project, Profile } from '@/types'

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

export interface ActiveFilters {
  statuses: TaskStatus[]
  priorities: TaskPriority[]
  projectIds: string[]
  assigneeIds: string[]
}

interface ViewFilterPanelProps {
  filters: ActiveFilters
  onChange: (filters: ActiveFilters) => void
  projects: Project[]
  profiles: Profile[]
}

type FilterField = 'status' | 'priority' | 'project' | 'assignee'

const FILTER_FIELDS: { id: FilterField; label: string }[] = [
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'project', label: 'Project' },
  { id: 'assignee', label: 'Assignee' },
]

export function ViewFilterPanel({ filters, onChange, projects, profiles }: ViewFilterPanelProps) {
  const [open, setOpen] = useState(false)
  const [expandedField, setExpandedField] = useState<FilterField | null>(null)

  const activeCount =
    filters.statuses.length +
    filters.priorities.length +
    filters.projectIds.length +
    filters.assigneeIds.length

  function toggleStatus(s: TaskStatus) {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s]
    onChange({ ...filters, statuses: next })
  }

  function togglePriority(p: TaskPriority) {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p]
    onChange({ ...filters, priorities: next })
  }

  function toggleProject(id: string) {
    const next = filters.projectIds.includes(id)
      ? filters.projectIds.filter((x) => x !== id)
      : [...filters.projectIds, id]
    onChange({ ...filters, projectIds: next })
  }

  function toggleAssignee(id: string) {
    const next = filters.assigneeIds.includes(id)
      ? filters.assigneeIds.filter((x) => x !== id)
      : [...filters.assigneeIds, id]
    onChange({ ...filters, assigneeIds: next })
  }

  function clearAll() {
    onChange({ statuses: [], priorities: [], projectIds: [], assigneeIds: [] })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 h-8 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
              activeCount > 0 && 'border-primary text-primary'
            )}
          />
        }
      >
        <Filter className="h-3.5 w-3.5" />
        Filter
        {activeCount > 0 && (
          <Badge className="h-4 min-w-4 rounded-full px-1 text-[10px]">{activeCount}</Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0" sideOffset={6}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filters
          </span>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-1 px-3 py-2 border-b">
            {filters.statuses.map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className="flex items-center gap-1 rounded-full border bg-accent px-2 py-0.5 text-xs hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors"
              >
                <StatusIcon status={s} />
                {STATUS_LABELS[s]}
                <X className="h-2.5 w-2.5" />
              </button>
            ))}
            {filters.priorities.map((p) => (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className="flex items-center gap-1 rounded-full border bg-accent px-2 py-0.5 text-xs hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors"
              >
                <PriorityIcon priority={p} />
                {PRIORITY_LABELS[p]}
                <X className="h-2.5 w-2.5" />
              </button>
            ))}
            {filters.projectIds.map((id) => {
              if (id === '__no_project__') {
                return (
                  <button
                    key="__no_project__"
                    onClick={() => toggleProject('__no_project__')}
                    className="flex items-center gap-1 rounded-full border bg-accent px-2 py-0.5 text-xs hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors"
                  >
                    <span className="h-2 w-2 rounded-full border border-dashed border-muted-foreground/50" />
                    No project
                    <X className="h-2.5 w-2.5" />
                  </button>
                )
              }
              const p = projects.find((x) => x.id === id)
              return p ? (
                <button
                  key={id}
                  onClick={() => toggleProject(id)}
                  className="flex items-center gap-1 rounded-full border bg-accent px-2 py-0.5 text-xs hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                  <X className="h-2.5 w-2.5" />
                </button>
              ) : null
            })}
            {filters.assigneeIds.map((id) => {
              const a = profiles.find((x) => x.id === id)
              return a ? (
                <button
                  key={id}
                  onClick={() => toggleAssignee(id)}
                  className="flex items-center gap-1 rounded-full border bg-accent px-2 py-0.5 text-xs hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors"
                >
                  {a.name ?? 'Unknown'}
                  <X className="h-2.5 w-2.5" />
                </button>
              ) : null
            })}
          </div>
        )}

        {/* Add filter section */}
        <div className="p-1">
          {FILTER_FIELDS.map((field) => (
            <div key={field.id}>
              <button
                onClick={() =>
                  setExpandedField(expandedField === field.id ? null : field.id)
                }
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  {field.label}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform',
                    expandedField === field.id && 'rotate-180'
                  )}
                />
              </button>

              {expandedField === field.id && (
                <div className="ml-6 mb-1 space-y-0.5">
                  {field.id === 'status' &&
                    STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-accent',
                          filters.statuses.includes(s) && 'bg-accent font-medium'
                        )}
                      >
                        <StatusIcon status={s} />
                        {STATUS_LABELS[s]}
                        {filters.statuses.includes(s) && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}

                  {field.id === 'priority' &&
                    PRIORITIES.map((p) => (
                      <button
                        key={p}
                        onClick={() => togglePriority(p)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-accent',
                          filters.priorities.includes(p) && 'bg-accent font-medium'
                        )}
                      >
                        <PriorityIcon priority={p} />
                        {PRIORITY_LABELS[p]}
                        {filters.priorities.includes(p) && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}

                  {field.id === 'project' && (
                    <>
                      {/* No project option */}
                      <button
                        onClick={() => toggleProject('__no_project__')}
                        className={cn(
                          'flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-accent',
                          filters.projectIds.includes('__no_project__') && 'bg-accent font-medium'
                        )}
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full border border-dashed border-muted-foreground/50" />
                        No project
                        {filters.projectIds.includes('__no_project__') && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => toggleProject(p.id)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-accent',
                            filters.projectIds.includes(p.id) && 'bg-accent font-medium'
                          )}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="truncate">{p.name}</span>
                          {filters.projectIds.includes(p.id) && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {field.id === 'assignee' &&
                    (profiles.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">No members</p>
                    ) : (
                      profiles.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => toggleAssignee(a.id)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-accent',
                            filters.assigneeIds.includes(a.id) && 'bg-accent font-medium'
                          )}
                        >
                          <span className="h-5 w-5 shrink-0 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase">
                            {(a.name ?? '?').charAt(0)}
                          </span>
                          <span className="truncate">{a.name ?? 'Unknown'}</span>
                          {filters.assigneeIds.includes(a.id) && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      ))
                    ))}
                </div>
              )}
              <Separator className="my-0.5 last:hidden" />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
