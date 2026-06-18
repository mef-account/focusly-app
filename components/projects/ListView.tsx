'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
} from '@tanstack/react-table'
import { ArrowUpDown, Trash2, ChevronDown, FileText, Check, CalendarIcon, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateTask, useDeleteTask } from '@/lib/queries/useTasks'
import { useTaskPanelStore } from '@/store/useTaskPanelStore'
import { useIsViewer } from '@/lib/hooks/useCurrentUserRole'
import { TaskTimerButton } from '@/components/tracker/TaskTimerButton'
import { AssigneePicker } from '@/components/tasks/AssigneePicker'
import { StatusIcon } from '@/components/tasks/StatusIcon'
import { PriorityIcon } from '@/components/tasks/PriorityIcon'
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  formatDate,
  formatMinutes,
  formatDuration,
  parseEstimate,
  getTaskKey,
  cn,
} from '@/lib/utils'
import type { Task, TaskStatus, TaskPriority } from '@/types'

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3, none: 4,
}

function isOverdue(due: string | null | undefined): boolean {
  if (!due) return false
  return new Date(due + 'T00:00:00') < new Date(new Date().toDateString())
}

interface ListViewProps {
  tasks: Task[]
  timeTotals?: Record<string, number>
  noteCounts?: Record<string, number>
  persistKey?: string
  showProject?: boolean
}

export function ListView({
  tasks,
  timeTotals = {},
  noteCounts = {},
  persistKey = 'focusly:list-col-sizing',
  showProject = false,
}: ListViewProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})

  // Load saved column widths
  useEffect(() => {
    try {
      const raw = localStorage.getItem(persistKey)
      setColumnSizing(raw ? JSON.parse(raw) : {})
    } catch {
      setColumnSizing({})
    }
  }, [persistKey])

  const handleColumnSizingChange = (updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
    setColumnSizing((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try { localStorage.setItem(persistKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { open } = useTaskPanelStore()
  const isViewer = useIsViewer()

  // Pre-sort: done/cancelled last → priority → created_at newest first
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aFinished = a.status === 'done' || a.status === 'cancelled'
      const bFinished = b.status === 'done' || b.status === 'cancelled'
      if (aFinished !== bFinished) return aFinished ? 1 : -1
      const pd = (PRIORITY_ORDER[a.priority ?? 'none'] ?? 4) - (PRIORITY_ORDER[b.priority ?? 'none'] ?? 4)
      if (pd !== 0) return pd
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [tasks])

  const columns: ColumnDef<Task>[] = [
    ...(!isViewer ? [{
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v: boolean) => table.toggleAllPageRowsSelected(v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v: boolean) => row.toggleSelected(v)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
      meta: { className: 'text-center px-2' },
      size: 36,
      enableSorting: false,
      enableResizing: false,
    } as ColumnDef<Task>] : []),
    {
      id: 'task_key',
      header: 'ID',
      size: 64,
      enableResizing: false,
      enableSorting: false,
      meta: { className: 'px-2' },
      cell: ({ row }) => {
        const key = getTaskKey(row.original)
        return (
          <span className="text-[11px] font-mono text-muted-foreground/60 tabular-nums">
            {key ?? ''}
          </span>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      size: 120,
      enableResizing: true,
      meta: { className: 'px-2' },
      cell: ({ row }) => {
        const s = row.original.status
        if (isViewer) {
          return (
            <span className="flex items-center gap-1.5 px-1.5 py-0.5">
              <StatusIcon status={s} />
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</span>
            </span>
          )
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  title={STATUS_LABELS[s]}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-accent transition-colors"
                />
              }
            >
              <StatusIcon status={s} />
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {STATUSES.map((st) => (
                <DropdownMenuItem
                  key={st}
                  onClick={(e) => { e.stopPropagation(); updateTask.mutate({ id: row.original.id, status: st }) }}
                >
                  <StatusIcon status={st} />
                  <span className="text-sm">{STATUS_LABELS[st]}</span>
                  {s === st && <Check className="ml-auto h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'title',
      size: 320,
      minSize: 160,
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-2.5 h-7 gap-1 px-1 text-[11px] uppercase tracking-wide" onClick={() => column.toggleSorting()}>
          Task <ArrowUpDown className="h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const notes = noteCounts[row.original.id] ?? 0
        return (
          <span className="flex items-center gap-1.5">
            <span className="font-medium">{row.original.title}</span>
            {notes > 0 && (
              <span
                className="flex items-center gap-0.5 text-xs text-muted-foreground"
                title={`${notes} note${notes === 1 ? '' : 's'}`}
              >
                <FileText className="h-3 w-3" />
                {notes}
              </span>
            )}
          </span>
        )
      },
    },
    ...(showProject ? [{
      id: 'project',
      header: 'Project',
      size: 160,
      cell: ({ row }: { row: { original: Task } }) => {
        const p = row.original.project
        if (!p) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <span className="flex items-center gap-1.5 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="truncate">{p.name}</span>
          </span>
        )
      },
      enableSorting: false,
    } as ColumnDef<Task>] : []),
    {
      accessorKey: 'assignee',
      header: 'Assignee',
      size: 120,
      cell: ({ row }) => (
        <AssigneePicker
          value={row.original.assignee_id}
          assignee={row.original.assignee}
          stopPropagation
          onChange={isViewer ? undefined : (id) => updateTask.mutate({ id: row.original.id, assignee_id: id })}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      size: 110,
      cell: ({ row }) => {
        const p = row.original.priority
        if (isViewer) {
          return (
            <span className="flex items-center gap-1.5 px-1.5 py-0.5">
              <PriorityIcon priority={p} />
              <span className="text-xs text-muted-foreground">{PRIORITY_LABELS[p]}</span>
            </span>
          )
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  title={PRIORITY_LABELS[p]}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-accent transition-colors"
                />
              }
            >
              <PriorityIcon priority={p} />
              <span className="text-xs text-muted-foreground">{PRIORITY_LABELS[p]}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {PRIORITIES.map((pr) => (
                <DropdownMenuItem
                  key={pr}
                  onClick={(e) => { e.stopPropagation(); updateTask.mutate({ id: row.original.id, priority: pr }) }}
                >
                  <PriorityIcon priority={pr} />
                  <span className="text-sm">{PRIORITY_LABELS[pr]}</span>
                  {p === pr && <Check className="ml-auto h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
    {
      accessorKey: 'due_date',
      size: 120,
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-2.5 h-7 gap-1 px-1 text-[11px] uppercase tracking-wide" onClick={() => column.toggleSorting()}>
          Due date <ArrowUpDown className="h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const due = row.original.due_date
        const overdue = isOverdue(due)
        if (isViewer) {
          return (
            <span className={cn('flex items-center gap-1 px-1 py-0.5 text-xs tabular-nums', overdue ? 'font-medium text-red-500' : 'text-muted-foreground')}>
              <CalendarIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
              {due ? format(parseISO(due), 'MMM d') : '—'}
            </span>
          )
        }
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [open, setOpen] = useState(false)
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                render={
                  <button className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-accent transition-colors" />
                }
              >
                <CalendarIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className={cn('tabular-nums', overdue ? 'font-medium text-red-500' : 'text-muted-foreground')}>
                  {due ? format(parseISO(due), 'MMM d') : '—'}
                </span>
                {due && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); updateTask.mutate({ id: row.original.id, due_date: null }) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); updateTask.mutate({ id: row.original.id, due_date: null }) } }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={due ? parseISO(due) : undefined}
                  onSelect={(date) => {
                    updateTask.mutate({ id: row.original.id, due_date: date ? format(date, 'yyyy-MM-dd') : null })
                    setOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        )
      },
    },
    {
      accessorKey: 'estimate_minutes',
      header: 'Estimate',
      size: 100,
      cell: ({ row }) => {
        if (isViewer) {
          return (
            <span className="px-1 py-0.5 text-xs text-muted-foreground tabular-nums">
              {row.original.estimate_minutes ? formatMinutes(row.original.estimate_minutes) : '—'}
            </span>
          )
        }
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [editing, setEditing] = useState(false)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [val, setVal] = useState('')
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {editing ? (
              <input
                autoFocus
                className="w-full bg-transparent text-xs outline-none border-b border-primary tabular-nums text-foreground"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={() => {
                  const mins = val.trim() ? parseEstimate(val) : null
                  updateTask.mutate({ id: row.original.id, estimate_minutes: mins })
                  setEditing(false)
                  setVal('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') { setEditing(false); setVal('') }
                }}
              />
            ) : (
              <button
                className="w-full text-left text-xs text-muted-foreground tabular-nums hover:bg-accent rounded px-1 py-0.5 transition-colors"
                onClick={() => {
                  setVal(row.original.estimate_minutes ? formatMinutes(row.original.estimate_minutes) : '')
                  setEditing(true)
                }}
              >
                {row.original.estimate_minutes ? formatMinutes(row.original.estimate_minutes) : '—'}
              </button>
            )}
          </div>
        )
      },
    },
    {
      id: 'logged',
      header: 'Logged',
      size: 100,
      cell: ({ row }) => {
        const secs = timeTotals[row.original.id] ?? 0
        return (
          <span className="text-sm text-muted-foreground tabular-nums">
            {secs ? formatDuration(secs) : '—'}
          </span>
        )
      },
      enableSorting: false,
    },
    {
      id: 'timer',
      header: '',
      size: 64,
      enableResizing: false,
      cell: ({ row }) => isViewer ? null : <TaskTimerButton task={row.original} />,
      enableSorting: false,
    },
  ]

  const table = useReactTable({
    data: sortedTasks,
    columns,
    state: { sorting, globalFilter, rowSelection, columnSizing },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: handleColumnSizingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 60, maxSize: 600 },
  })

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])
    .map((i) => sortedTasks[parseInt(i)]?.id).filter(Boolean)

  const colCount = columns.length

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search tasks…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 max-w-xs text-sm"
        />
        {!isViewer && selectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5">
            <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger render={<button className="flex items-center gap-1 text-xs font-medium hover:text-primary" />}>
                Status <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => {
                      selectedIds.forEach((id) => updateTask.mutate({ id, status: s }))
                      setRowSelection({})
                    }}
                  >
                    <StatusIcon status={s} />
                    <span className="text-sm">{STATUS_LABELS[s]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                selectedIds.forEach((id) => deleteTask.mutate(id))
                setRowSelection({})
              }}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table
          className="table-fixed border-collapse text-[13px] [&_td]:border-r [&_td:last-child]:border-r-0 [&_th]:border-r [&_th:last-child]:border-r-0"
          style={{ width: Math.max(table.getTotalSize(), 100) }}
        >
          <thead className="border-b bg-muted/40">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className={cn(
                      'group/th relative h-8 px-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground',
                      (h.column.columnDef.meta as { className?: string } | undefined)?.className
                    )}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getCanResize() && (
                      <div
                        onMouseDown={h.getResizeHandler()}
                        onTouchStart={h.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none',
                          'opacity-0 transition-opacity hover:opacity-100 group-hover/th:opacity-100',
                          'after:absolute after:right-0 after:top-1/2 after:h-4 after:w-px after:-translate-y-1/2 after:bg-foreground/40',
                          h.column.getIsResizing() && 'opacity-100 after:bg-primary after:w-0.5'
                        )}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-10 text-center text-muted-foreground">
                  No tasks yet
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-0 hover:bg-accent/40 cursor-pointer transition-colors"
                  onClick={() => open(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={cn(
                        'h-8 truncate px-2.5 py-0.5',
                        (cell.column.columnDef.meta as { className?: string } | undefined)?.className
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}

          </tbody>
        </table>
      </div>
    </div>
  )
}
