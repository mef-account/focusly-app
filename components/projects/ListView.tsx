'use client'

import { useState, useEffect } from 'react'
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
import { ArrowUpDown, Trash2, ChevronDown, FileText, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateTask, useDeleteTask } from '@/lib/queries/useTasks'
import { useTaskPanelStore } from '@/store/useTaskPanelStore'
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
  cn,
} from '@/lib/utils'
import type { Task, TaskStatus, TaskPriority } from '@/types'

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

interface ListViewProps {
  tasks: Task[]
  timeTotals?: Record<string, number>
  noteCounts?: Record<string, number>
  /** localStorage key used to persist column widths. */
  persistKey?: string
  /** Show the project column (useful in cross-project views). */
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

  // Load saved column widths on mount (per persistKey)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(persistKey)
      setColumnSizing(raw ? JSON.parse(raw) : {})
    } catch {
      setColumnSizing({})
    }
  }, [persistKey])

  // Persist only when the user actually resizes (avoids overwriting on mount)
  const handleColumnSizingChange = (updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
    setColumnSizing((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        localStorage.setItem(persistKey, JSON.stringify(next))
      } catch {
        /* ignore quota / unavailable storage */
      }
      return next
    })
  }
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { open } = useTaskPanelStore()

  const columns: ColumnDef<Task>[] = [
    {
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
    },
    {
      id: 'status',
      header: '',
      size: 44,
      enableResizing: false,
      meta: { className: 'text-center px-1.5' },
      cell: ({ row }) => {
        const s = row.original.status
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  title={STATUS_LABELS[s]}
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent transition-colors"
                />
              }
            >
              <StatusIcon status={s} />
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
      size: 340,
      minSize: 160,
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-2.5 h-7 gap-1 px-1 text-[11px] uppercase tracking-wide" onClick={() => column.toggleSorting()}>
          Title <ArrowUpDown className="h-3 w-3" />
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
      accessorKey: 'priority',
      header: 'Priority',
      size: 96,      cell: ({ row }) => {
        const p = row.original.priority
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  title={PRIORITY_LABELS[p]}
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent transition-colors"
                />
              }
            >
              <PriorityIcon priority={p} />
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
      id: 'assignee',
      header: 'Assignee',
      size: 120,
      cell: ({ row }) => (
        <AssigneePicker
          value={row.original.assignee_id}
          assignee={row.original.assignee}
          stopPropagation
          onChange={(id) => updateTask.mutate({ id: row.original.id, assignee_id: id })}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'due_date',
      size: 120,
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-2.5 h-7 gap-1 px-1 text-[11px] uppercase tracking-wide" onClick={() => column.toggleSorting()}>
          Due <ArrowUpDown className="h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.due_date)}</span>
      ),
    },
    {
      accessorKey: 'estimate_minutes',
      header: 'Estimate',
      size: 100,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.estimate_minutes ? formatMinutes(row.original.estimate_minutes) : '—'}
        </span>
      ),
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
      cell: ({ row }) => <TaskTimerButton task={row.original} />,
      enableSorting: false,
    },
  ]

  const table = useReactTable({
    data: tasks,
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
    .map((i) => tasks[parseInt(i)]?.id).filter(Boolean)

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
        {selectedIds.length > 0 && (
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
                <td colSpan={columns.length} className="py-10 text-center text-muted-foreground">
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
