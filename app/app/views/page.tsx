'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import React from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Save,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Check,
  Clock,
} from 'lucide-react'
import { useTasks, useUpdateTask } from '@/lib/queries/useTasks'
import { useTimeTotalsByTask } from '@/lib/queries/useTimeEntries'
import { useProjects } from '@/lib/queries/useProjects'
import { useProfiles } from '@/lib/queries/useProfiles'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { usePortfolios } from '@/lib/queries/usePortfolios'
import { useViews, useCreateView, useUpdateView, useDeleteView } from '@/lib/queries/useViews'
import { useTaskPanelStore } from '@/store/useTaskPanelStore'
import { createClient } from '@/lib/supabase/client'
import { ViewFilterPanel, type ActiveFilters } from '@/components/views/ViewFilterPanel'
import { ViewDisplayPanel, type DisplayOptions, type ColumnId } from '@/components/views/ViewDisplayPanel'
import { StatusIcon } from '@/components/tasks/StatusIcon'
import { PriorityIcon } from '@/components/tasks/PriorityIcon'
import { AssigneePicker } from '@/components/tasks/AssigneePicker'
import { TaskTimerButton } from '@/components/tracker/TaskTimerButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { STATUS_LABELS, PRIORITY_LABELS, formatDate, formatMinutes, formatDuration, cn } from '@/lib/utils'
import type { Task, TaskStatus, TaskPriority, ViewGroupBy } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

const DEFAULT_DISPLAY: DisplayOptions = {
  groupBy: 'none',
  subGroupBy: 'none',
  sortField: 'created_at',
  sortDir: 'asc',
  visibleColumns: ['status', 'assignee', 'priority', 'project', 'due_date', 'created_at'],
}

const DEFAULT_FILTERS: ActiveFilters = {
  statuses: ['backlog'],
  priorities: [],
  projectIds: [],
  assigneeIds: [],
  portfolioIds: [],
  workspaceIds: [],
}

// ─── Grouping helpers ─────────────────────────────────────────────────────────

const STATUS_ORDER: TaskStatus[] = ['in_progress', 'todo', 'backlog', 'done', 'cancelled']
const PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

function getGroupKey(task: Task, groupBy: ViewGroupBy): string {
  switch (groupBy) {
    case 'status':
      return task.status
    case 'priority':
      return task.priority
    case 'project':
      return task.project_id ? (task.project?.name ?? task.project_id) : '— No project'
    case 'assignee':
      return task.assignee_id ? (task.assignee?.name ?? task.assignee_id) : '— Unassigned'
    case 'portfolio':
      return task.project?.portfolio_id
        ? (task.project.portfolio_id)
        : '— No portfolio'
    case 'workspace':
      return task.project?.workspace_id ?? '— No workspace'
    case 'due_date': {
      if (!task.due_date) return '— No due date'
      const d = new Date(task.due_date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      if (d < today) return 'Overdue'
      if (d.getTime() === today.getTime()) return 'Today'
      if (d.getTime() === tomorrow.getTime()) return 'Tomorrow'
      return 'Upcoming'
    }
    default:
      return 'All tasks'
  }
}

function sortGroups(keys: string[], groupBy: ViewGroupBy): string[] {
  if (groupBy === 'status') {
    const ordered = STATUS_ORDER.filter((s) => keys.includes(s))
    const rest = keys.filter((k) => !STATUS_ORDER.includes(k as TaskStatus))
    return [...ordered, ...rest]
  }
  if (groupBy === 'priority') {
    const ordered = PRIORITY_ORDER.filter((p) => keys.includes(p))
    const rest = keys.filter((k) => !PRIORITY_ORDER.includes(k as TaskPriority))
    return [...ordered, ...rest]
  }
  if (groupBy === 'due_date') {
    const order = ['Overdue', 'Today', 'Tomorrow', 'Upcoming', '— No due date']
    const ordered = order.filter((k) => keys.includes(k))
    const rest = keys.filter((k) => !order.includes(k))
    return [...ordered, ...rest]
  }
  return [...keys].sort((a, b) => {
    if (a.startsWith('—')) return 1
    if (b.startsWith('—')) return -1
    return a.localeCompare(b)
  })
}

function sortTasks(tasks: Task[], sortField: string, sortDir: 'asc' | 'desc'): Task[] {
  return [...tasks].sort((a, b) => {
    let va: string | number = ''
    let vb: string | number = ''
    if (sortField === 'priority') {
      va = PRIORITY_ORDER.indexOf(a.priority)
      vb = PRIORITY_ORDER.indexOf(b.priority)
    } else if (sortField === 'due_date') {
      va = a.due_date ?? '\uffff'
      vb = b.due_date ?? '\uffff'
    } else if (sortField === 'created_at') {
      va = a.created_at
      vb = b.created_at
    } else if (sortField === 'title') {
      va = a.title.toLowerCase()
      vb = b.title.toLowerCase()
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })
}

function getGroupLabel(key: string, groupBy: ViewGroupBy): string {
  if (groupBy === 'status') return STATUS_LABELS[key as TaskStatus] ?? key
  if (groupBy === 'priority') return PRIORITY_LABELS[key as TaskPriority] ?? key
  return key
}

// ─── Filter serialization (for saving to DB) ──────────────────────────────────

function filtersToViewFilters(f: ActiveFilters) {
  const out: import('@/types').ViewFilter[] = []
  if (f.statuses.length) out.push({ field: 'status', operator: 'is', value: f.statuses })
  if (f.priorities.length) out.push({ field: 'priority', operator: 'is', value: f.priorities })
  if (f.projectIds.length) out.push({ field: 'project_id', operator: 'is', value: f.projectIds })
  if (f.assigneeIds.length) out.push({ field: 'assignee_id', operator: 'is', value: f.assigneeIds })
  if (f.portfolioIds.length) out.push({ field: 'portfolio_id', operator: 'is', value: f.portfolioIds })
  if (f.workspaceIds.length) out.push({ field: 'workspace_id', operator: 'is', value: f.workspaceIds })
  return out
}

function viewFiltersToActive(vf: { field: string; operator: string; value: unknown }[]): ActiveFilters {
  const result: ActiveFilters = { statuses: [], priorities: [], projectIds: [], assigneeIds: [], portfolioIds: [], workspaceIds: [] }
  for (const f of vf) {
    const v = Array.isArray(f.value) ? f.value : [f.value].filter(Boolean)
    if (f.field === 'status') result.statuses = v as TaskStatus[]
    if (f.field === 'priority') result.priorities = v as TaskPriority[]
    if (f.field === 'project_id') result.projectIds = v as string[]
    if (f.field === 'assignee_id') result.assigneeIds = v as string[]
    if (f.field === 'portfolio_id') result.portfolioIds = v as string[]
    if (f.field === 'workspace_id') result.workspaceIds = v as string[]
  }
  return result
}

// ─── Column resize ────────────────────────────────────────────────────────────

const COL_PERSIST_KEY = 'focusly:views-col-widths-v5'

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  title:            380,
  status:            24,
  priority:         110,
  assignee:          60,
  project:          160,
  due_date:         110,
  created_at:       110,
  estimate_minutes:  90,
  logged:            90,
}

function useColWidths() {
  const [widths, setWidths] = useState<Record<string, number>>(DEFAULT_COL_WIDTHS)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COL_PERSIST_KEY)
      if (raw) setWidths({ ...DEFAULT_COL_WIDTHS, ...JSON.parse(raw) })
    } catch { /* ignore */ }
  }, [])

  const startResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = widths[col] ?? DEFAULT_COL_WIDTHS[col] ?? 80
    const onMove = (mv: MouseEvent) => {
      const next = Math.max(32, startW + mv.clientX - startX)
      setWidths((prev) => ({ ...prev, [col]: next }))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setWidths((prev) => {
        try { localStorage.setItem(COL_PERSIST_KEY, JSON.stringify(prev)) } catch { /* ignore */ }
        return prev
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return { widths, startResize }
}

// ─── Group header icon ────────────────────────────────────────────────────────

function GroupIcon({ groupKey, groupBy }: { groupKey: string; groupBy: ViewGroupBy }) {
  if (groupBy === 'status') return <StatusIcon status={groupKey as TaskStatus} />
  if (groupBy === 'priority') return <PriorityIcon priority={groupKey as TaskPriority} />
  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

function ViewsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewId = searchParams.get('view')

  const { data: tasks = [], isLoading } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: profiles = [] } = useProfiles()
  const { data: workspaces = [] } = useWorkspaces()
  const { data: portfolios = [] } = usePortfolios()
  const workspace = workspaces[0]
  const { data: savedViews = [] } = useViews()
  const { data: timeTotals = {} } = useTimeTotalsByTask(tasks.map((t) => t.id))
  const updateTask = useUpdateTask()
  const createView = useCreateView()
  const updateView = useUpdateView()
  const deleteView = useDeleteView()
  const { open: openTask } = useTaskPanelStore()

  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS)
  const [display, setDisplay] = useState<DisplayOptions>(DEFAULT_DISPLAY)
  const [viewName, setViewName] = useState('Backlog')
  const [isDirty, setIsDirty] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [searchText, setSearchText] = useState('')
  const { widths: colW, startResize } = useColWidths()

  const activeView = savedViews.find((v) => v.id === viewId) ?? null
  const sortedViews = [...savedViews].sort((a, b) => a.name.localeCompare(b.name))

  // Load saved view when URL param changes
  useEffect(() => {
    if (activeView) {
      setViewName(activeView.name)
      setFilters(viewFiltersToActive(activeView.filters as { field: string; operator: string; value: unknown }[]))
      setDisplay({
        groupBy: activeView.group_by ?? 'status',
        subGroupBy: 'none',
        sortField: (activeView.sort?.column as DisplayOptions['sortField']) ?? 'priority',
        sortDir: (activeView.sort?.direction as 'asc' | 'desc') ?? 'asc',
        visibleColumns: (activeView.visible_columns ?? DEFAULT_DISPLAY.visibleColumns) as ColumnId[],
      })
      setIsDirty(false)
    } else if (!viewId) {
      setViewName('Backlog')
      setFilters(DEFAULT_FILTERS)
      setDisplay(DEFAULT_DISPLAY)
      setIsDirty(false)
    }
  }, [viewId, activeView?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFiltersChange(f: ActiveFilters) {
    setFilters(f)
    setIsDirty(true)
  }

  function handleDisplayChange(d: DisplayOptions) {
    setDisplay(d)
    setIsDirty(true)
  }

  // ── Apply filters ──────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    let result = tasks

    if (searchText) {
      const q = searchText.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }
    if (filters.statuses.length)
      result = result.filter((t) => filters.statuses.includes(t.status))
    if (filters.priorities.length)
      result = result.filter((t) => filters.priorities.includes(t.priority))
    if (filters.projectIds.length) {
      const wantNoProject = filters.projectIds.includes('__no_project__')
      const realIds = filters.projectIds.filter((id) => id !== '__no_project__')
      result = result.filter((t) => {
        if (t.project_id == null) return wantNoProject
        return realIds.includes(t.project_id)
      })
    }
    if (filters.assigneeIds.length)
      result = result.filter((t) => t.assignee_id != null && filters.assigneeIds.includes(t.assignee_id))
    if (filters.portfolioIds.length)
      result = result.filter((t) => t.project?.portfolio_id != null && filters.portfolioIds.includes(t.project.portfolio_id))
    if (filters.workspaceIds.length)
      result = result.filter((t) => t.project?.workspace_id != null && filters.workspaceIds.includes(t.project.workspace_id))

    return sortTasks(result, display.sortField, display.sortDir)
  }, [tasks, filters, display.sortField, display.sortDir, searchText])

  // ── Grouping ───────────────────────────────────────────────────────────────

  // Resolve portfolio/workspace names for group labels
  const portfolioNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of portfolios) m.set(p.id, p.name)
    return m
  }, [portfolios])

  const workspaceNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const w of workspaces) m.set(w.id, w.name)
    return m
  }, [workspaces])

  function resolveGroupLabel(key: string, groupBy: ViewGroupBy): string {
    if (groupBy === 'portfolio' && key !== '— No portfolio') return portfolioNameById.get(key) ?? key
    if (groupBy === 'workspace' && key !== '— No workspace') return workspaceNameById.get(key) ?? key
    return getGroupLabel(key, groupBy)
  }

  const groups = useMemo(() => {
    if (display.groupBy === 'none') {
      if (display.subGroupBy === 'none') {
        return [{ key: 'all', label: 'All tasks', tasks: filteredTasks, subGroups: null as null | { key: string; label: string; tasks: Task[] }[] }]
      }
      // Sub-group within the single "all" group
      const subMap = new Map<string, Task[]>()
      for (const task of filteredTasks) {
        const sk = getGroupKey(task, display.subGroupBy)
        if (!subMap.has(sk)) subMap.set(sk, [])
        subMap.get(sk)!.push(task)
      }
      const sortedSubKeys = sortGroups(Array.from(subMap.keys()), display.subGroupBy)
      return [{
        key: 'all',
        label: 'All tasks',
        tasks: filteredTasks,
        subGroups: sortedSubKeys.map((sk) => ({
          key: sk,
          label: resolveGroupLabel(sk, display.subGroupBy),
          tasks: subMap.get(sk)!,
        })),
      }]
    }

    const map = new Map<string, Task[]>()
    for (const task of filteredTasks) {
      const key = getGroupKey(task, display.groupBy)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    const sortedKeys = sortGroups(Array.from(map.keys()), display.groupBy)
    return sortedKeys.map((key) => {
      const groupTasks = map.get(key)!
      let subGroups: { key: string; label: string; tasks: Task[] }[] | null = null
      if (display.subGroupBy !== 'none') {
        const subMap = new Map<string, Task[]>()
        for (const task of groupTasks) {
          const sk = getGroupKey(task, display.subGroupBy)
          if (!subMap.has(sk)) subMap.set(sk, [])
          subMap.get(sk)!.push(task)
        }
        const sortedSubKeys = sortGroups(Array.from(subMap.keys()), display.subGroupBy)
        subGroups = sortedSubKeys.map((sk) => ({
          key: sk,
          label: resolveGroupLabel(sk, display.subGroupBy),
          tasks: subMap.get(sk)!,
        }))
      }
      return {
        key,
        label: resolveGroupLabel(key, display.groupBy),
        tasks: groupTasks,
        subGroups,
      }
    })
  }, [filteredTasks, display.groupBy, display.subGroupBy, portfolioNameById, workspaceNameById]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSaveNew() {
    if (!saveName.trim() || !workspace) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const view = await createView.mutateAsync({
      workspace_id: workspace.id,
      user_id: user?.id ?? '',
      name: saveName.trim(),
      filters: filtersToViewFilters(filters),
      group_by: display.groupBy,
      group_config: {},
      visible_columns: display.visibleColumns,
      sort: { column: display.sortField, direction: display.sortDir },
      project_ids: null,
      show_subitems: true,
      is_default: false,
    })
    setSaveDialogOpen(false)
    setSaveName('')
    setIsDirty(false)
    router.push(`/app/views?view=${view.id}`)
  }

  async function handleUpdate() {
    if (!activeView) return
    await updateView.mutateAsync({
      id: activeView.id,
      name: viewName,
      filters: filtersToViewFilters(filters),
      group_by: display.groupBy,
      visible_columns: display.visibleColumns,
      sort: { column: display.sortField, direction: display.sortDir },
    })
    setIsDirty(false)
  }

  async function handleDelete() {
    if (!activeView) return
    await deleteView.mutateAsync(activeView.id)
    router.push('/app/views')
  }

  async function handleRename(name: string) {
    setViewName(name)
    if (activeView) {
      await updateView.mutateAsync({ id: activeView.id, name })
    }
  }

  // ── Column visibility helpers ──────────────────────────────────────────────

  const visibleCols = display.visibleColumns
  const showCol = (id: ColumnId) => visibleCols.includes(id)

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col space-y-0">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          {editingName ? (
            <input
              autoFocus
              className="rounded border bg-transparent px-2 py-0.5 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onBlur={() => { setEditingName(false); handleRename(viewName) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { setEditingName(false); handleRename(viewName) }
                if (e.key === 'Escape') setEditingName(false)
              }}
            />
          ) : (
            <h1
              className={cn('text-lg font-semibold', activeView && 'cursor-pointer hover:opacity-70')}
              onClick={() => activeView && setEditingName(true)}
              title={activeView ? 'Click to rename' : undefined}
            >
              {viewName}
            </h1>
          )}
          {activeView && (
            <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${filteredTasks.length} task${filteredTasks.length === 1 ? '' : 's'}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Dirty indicator + save buttons */}
          {isDirty && (
            <>
              {activeView ? (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleUpdate}>
                  <Save className="h-3.5 w-3.5" /> Update view
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => { setSaveName(''); setSaveDialogOpen(true) }}
                >
                  <Save className="h-3.5 w-3.5" /> Save view
                </Button>
              )}
            </>
          )}
          {!isDirty && !activeView && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => { setSaveName(''); setSaveDialogOpen(true) }}
            >
              <Save className="h-3.5 w-3.5" /> Save view
            </Button>
          )}

          {/* View actions (for saved view) */}
          {activeView && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />}>
              <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingName(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete view
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Filter & Display buttons */}
          <ViewFilterPanel
            filters={filters}
            onChange={handleFiltersChange}
            projects={projects}
            profiles={profiles}
            portfolios={portfolios}
            workspaces={workspaces}
          />
          <ViewDisplayPanel options={display} onChange={handleDisplayChange} />
        </div>
      </div>

      {/* ── Main area: task list + right panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: search + table */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Search bar */}
          <div className="border-b px-6 py-2">
            <Input
              placeholder="Search tasks…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-7 max-w-xs text-xs"
            />
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-auto">
        {filteredTasks.length === 0 && !isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No tasks match your filters
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-[13px]">
            {/* Colgroup ensures all rows — header, group, task — use identical widths */}
            <colgroup>
              <col style={{ width: 24 }} />
              {showCol('status')           && <col style={{ width: colW['status'] }} />}
              <col style={{ width: colW['title'] }} />
              {showCol('priority')         && <col style={{ width: colW['priority'] }} />}
              {showCol('assignee')         && <col style={{ width: colW['assignee'] }} />}
              {showCol('project')          && <col style={{ width: colW['project'] }} />}
              {showCol('due_date')         && <col style={{ width: colW['due_date'] }} />}
              {showCol('created_at')       && <col style={{ width: colW['created_at'] }} />}
              {showCol('estimate_minutes') && <col style={{ width: colW['estimate_minutes'] }} />}
              {showCol('logged')           && <col style={{ width: colW['logged'] }} />}
              <col style={{ width: 32 }} />
            </colgroup>
            {/* Column headers */}
            <thead className="sticky top-0 z-10 border-b bg-background">
              <tr>
                <th style={{ width: 24 }} className="h-8 px-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">#</th>
                {showCol('status')           && <ColHeader label="Status"       col="status"           width={colW['status']}           onResize={startResize} center />}
                <ColHeader label="Task" col="title" width={colW['title']} onResize={startResize} />
                {showCol('priority')         && <ColHeader label="Priority"     col="priority"         width={colW['priority']}         onResize={startResize} />}
                {showCol('assignee')         && <ColHeader label="Assignee"     col="assignee"         width={colW['assignee']}         onResize={startResize} />}
                {showCol('project')          && <ColHeader label="Project"      col="project"          width={colW['project']}          onResize={startResize} />}
                {showCol('due_date')         && <ColHeader label="Due date"     col="due_date"         width={colW['due_date']}         onResize={startResize} />}
                {showCol('created_at')       && <ColHeader label="Created date" col="created_at"       width={colW['created_at']}       onResize={startResize} />}
                {showCol('estimate_minutes') && <ColHeader label="Estimate"     col="estimate_minutes" width={colW['estimate_minutes']} onResize={startResize} />}
                {showCol('logged')           && <ColHeader label="Logged"       col="logged"           width={colW['logged']}           onResize={startResize} />}
                <th style={{ width: 32 }} className="h-7 px-1 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground select-none whitespace-nowrap">Timer</th>
                <th style={{ width: 32 }} className="h-8 px-1" />
              </tr>
            </thead>

            <tbody>
              {groups.map((group) => {
                const collapsed = collapsedGroups.has(group.key)
                const toggle = () =>
                  setCollapsedGroups((prev) => {
                    const next = new Set(prev)
                    next.has(group.key) ? next.delete(group.key) : next.add(group.key)
                    return next
                  })

                const dueDates = group.tasks.map((t) => t.due_date).filter(Boolean) as string[]
                const maxDue = dueDates.length ? dueDates.sort().reverse()[0] : null
                const totalEstMins = group.tasks.reduce((s, t) => s + (t.estimate_minutes ?? 0), 0)
                const totalLogSecs = group.tasks.reduce((s, t) => s + (timeTotals[t.id] ?? 0), 0)

                const renderGroupHeader = (key: string, label: string, groupBy: ViewGroupBy, indent = false) => {
                  const isCollapsed = collapsedGroups.has(key)
                  const toggleKey = () => setCollapsedGroups((prev) => {
                    const next = new Set(prev)
                    next.has(key) ? next.delete(key) : next.add(key)
                    return next
                  })
                  return (
                    <tr
                      key={`hdr-${key}`}
                      className={cn(
                        'cursor-pointer select-none border-y border-border/60',
                        indent ? 'bg-muted/30' : 'bg-muted/60'
                      )}
                      onClick={toggleKey}
                    >
                      <td style={{ width: 24 }} className="h-7" />
                      {showCol('status') && <td style={{ width: colW['status'] }} />}
                      <td style={{ width: colW['title'] }} className="h-7 px-4">
                        <span className={cn('flex items-center gap-2 text-sm font-semibold text-foreground', indent && 'pl-4')}>
                          {isCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <GroupIcon groupKey={key} groupBy={groupBy} />
                          {label}
                          {!indent && (
                            <>
                              <span className="text-xs font-normal text-muted-foreground">
                                {group.tasks.length}
                              </span>
                              {totalEstMins > 0 && (
                                <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                                  · <Clock className="h-3 w-3" /> Est {formatMinutes(totalEstMins)}
                                </span>
                              )}
                              {totalLogSecs > 0 && (
                                <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                                  · <Clock className="h-3 w-3" /> Log {formatDuration(totalLogSecs)}
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </td>
                      {showCol('priority') && <td style={{ width: colW['priority'] }} />}
                      {showCol('assignee') && <td style={{ width: colW['assignee'] }} />}
                      {showCol('project') && <td style={{ width: colW['project'] }} />}
                      {showCol('due_date') && (
                        <td style={{ width: colW['due_date'] }} className="h-7 px-2 text-xs text-muted-foreground tabular-nums">
                          {!indent && maxDue ? formatDate(maxDue) : ''}
                        </td>
                      )}
                      {showCol('created_at') && <td style={{ width: colW['created_at'] }} />}
                      {showCol('estimate_minutes') && <td style={{ width: colW['estimate_minutes'] }} />}
                      {showCol('logged') && <td style={{ width: colW['logged'] }} />}
                      <td style={{ width: 32 }} />
                    </tr>
                  )
                }

                return (
                  <React.Fragment key={group.key}>
                    {/* Group header row */}
                    {display.groupBy !== 'none' && renderGroupHeader(group.key, group.label, display.groupBy)}

                    {!collapsed && (
                      group.subGroups ? (
                        // Sub-groups
                        group.subGroups.map((sub) => {
                          const subCollapsed = collapsedGroups.has(`sub-${sub.key}`)
                          return (
                            <React.Fragment key={`sub-${sub.key}`}>
                              {renderGroupHeader(`sub-${sub.key}`, sub.label, display.subGroupBy, true)}
                              {!subCollapsed && sub.tasks.map((task, idx) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  rowNum={idx + 1}
                                  timeTotals={timeTotals}
                                  colW={colW}
                                  showStatus={showCol('status')}
                                  showPriority={showCol('priority')}
                                  showAssignee={showCol('assignee')}
                                  showProject={showCol('project')}
                                  showDue={showCol('due_date')}
                                  showCreatedAt={showCol('created_at')}
                                  showEstimate={showCol('estimate_minutes')}
                                  showLogged={showCol('logged')}
                                  onOpen={() => openTask(task.id)}
                                  onUpdateTask={(updates) => updateTask.mutate({ id: task.id, ...updates })}
                                />
                              ))}
                            </React.Fragment>
                          )
                        })
                      ) : (
                        // Flat task rows
                        group.tasks.map((task, idx) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            rowNum={idx + 1}
                            timeTotals={timeTotals}
                            colW={colW}
                            showStatus={showCol('status')}
                            showPriority={showCol('priority')}
                            showAssignee={showCol('assignee')}
                            showProject={showCol('project')}
                            showDue={showCol('due_date')}
                            showCreatedAt={showCol('created_at')}
                            showEstimate={showCol('estimate_minutes')}
                            showLogged={showCol('logged')}
                            onOpen={() => openTask(task.id)}
                            onUpdateTask={(updates) => updateTask.mutate({ id: task.id, ...updates })}
                          />
                        ))
                      )
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
          </div>
        </div>{/* end left column */}

        {/* ── Right panel: saved views ── */}
        <div className="w-48 shrink-0 border-l flex flex-col overflow-y-auto">
          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Views
          </div>

          {/* Backlog (default) */}
          <button
            onClick={() => {
              if (viewId) {
                router.push('/app/views')
              } else {
                setFilters(DEFAULT_FILTERS)
                setDisplay(DEFAULT_DISPLAY)
                setSearchText('')
                setIsDirty(false)
              }
            }}
            className={cn(
              'w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent/50',
              !viewId ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground'
            )}
          >
            Backlog
          </button>

          {/* Saved views */}
          {sortedViews.map((v) => (
            <Link
              key={v.id}
              href={`/app/views?view=${v.id}`}
              className={cn(
                'w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent/50 truncate',
                viewId === v.id ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              {v.name}
            </Link>
          ))}

          {/* New saved view */}
          <button
            onClick={() => { setSaveName(''); setSaveDialogOpen(true) }}
            className="mt-auto border-t px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            + Save current view
          </button>
        </div>

      </div>{/* end main area flex row */}

      {/* ── Save View dialog ── */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              autoFocus
              placeholder="View name…"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNew} disabled={!saveName.trim() || createView.isPending}>
              {createView.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Col header with resize handle ───────────────────────────────────────────

function ColHeader({ label, col, width, onResize, center }: {
  label: string
  col: string
  width: number
  onResize: (col: string, e: React.MouseEvent) => void
  center?: boolean
}) {
  return (
    <th
      style={{ width }}
      className={cn(
        'group/th relative h-8 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground overflow-hidden',
        center ? 'text-center' : 'text-left'
      )}
    >
      <span className="truncate">{label}</span>
      <div
        onMouseDown={(e) => onResize(col, e)}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize',
          'opacity-0 transition-opacity hover:opacity-100 group-hover/th:opacity-100',
          'after:absolute after:right-0 after:top-1/2 after:h-4 after:w-px after:-translate-y-1/2 after:bg-foreground/30'
        )}
      />
    </th>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task
  rowNum: number
  timeTotals: Record<string, number>
  colW: Record<string, number>
  showStatus: boolean
  showPriority: boolean
  showAssignee: boolean
  showProject: boolean
  showDue: boolean
  showCreatedAt: boolean
  showEstimate: boolean
  showLogged: boolean
  onOpen: () => void
  onUpdateTask: (updates: Partial<Task>) => void
}

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr + 'T00:00:00') < today
}

function TaskRow({
  task,
  rowNum,
  timeTotals,
  colW,
  showStatus,
  showPriority,
  showAssignee,
  showProject,
  showDue,
  showCreatedAt,
  showEstimate,
  showLogged,
  onOpen,
  onUpdateTask,
}: TaskRowProps) {
  const secs = timeTotals[task.id] ?? 0
  const dueOverdue = isOverdue(task.due_date)

  return (
    <tr
      className="border-b last:border-0 hover:bg-accent/20 cursor-pointer transition-colors"
      onClick={onOpen}
    >
      {/* Row number */}
      <td style={{ width: 24 }} className="h-7 px-1 text-center text-[11px] text-muted-foreground/50 select-none tabular-nums">
        {rowNum}
      </td>

      {/* Status — icon only */}
      {showStatus && (
        <td style={{ width: colW['status'] }} className="h-7 px-1 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent transition-colors"
                  title={STATUS_LABELS[task.status]}
                />
              }
            >
              <StatusIcon status={task.status} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => onUpdateTask({ status: s })}>
                  <StatusIcon status={s} />
                  <span className="text-sm">{STATUS_LABELS[s]}</span>
                  {task.status === s && <Check className="ml-auto h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </td>
      )}

      {/* Title */}
      <td style={{ width: colW['title'] }} className="h-7 px-2">
        <span className="truncate block text-[13px]">{task.title}</span>
      </td>

      {/* Priority */}
      {showPriority && (
        <td style={{ width: colW['priority'] }} className="h-7 px-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-accent transition-colors" />
              }
            >
              <PriorityIcon priority={task.priority} />
              <span className="text-muted-foreground">{PRIORITY_LABELS[task.priority]}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {PRIORITIES.map((p) => (
                <DropdownMenuItem key={p} onClick={() => onUpdateTask({ priority: p })}>
                  <PriorityIcon priority={p} />
                  <span className="text-sm">{PRIORITY_LABELS[p]}</span>
                  {task.priority === p && <Check className="ml-auto h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}

      {/* Assignee */}
      {showAssignee && (
        <td style={{ width: colW['assignee'] }} className="h-7 px-2" onClick={(e) => e.stopPropagation()}>
          <AssigneePicker value={task.assignee_id} assignee={task.assignee} stopPropagation onChange={(id) => onUpdateTask({ assignee_id: id })} />
        </td>
      )}

      {/* Project */}
      {showProject && (
        <td style={{ width: colW['project'] }} className="h-7 px-2">
          {task.project ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: task.project.color }} />
              <span className="truncate">{task.project.name}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* Due date — red when overdue */}
      {showDue && (
        <td style={{ width: colW['due_date'] }} className="h-7 px-2">
          <span className={cn('text-xs tabular-nums', dueOverdue ? 'font-medium text-red-500' : 'text-muted-foreground')}>
            {formatDate(task.due_date) || '—'}
          </span>
        </td>
      )}

      {/* Created date */}
      {showCreatedAt && (
        <td style={{ width: colW['created_at'] }} className="h-7 px-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDate(task.created_at.split('T')[0]) || '—'}
          </span>
        </td>
      )}

      {/* Estimate */}
      {showEstimate && (
        <td style={{ width: colW['estimate_minutes'] }} className="h-7 px-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {task.estimate_minutes ? formatMinutes(task.estimate_minutes) : '—'}
          </span>
        </td>
      )}

      {/* Logged */}
      {showLogged && (
        <td style={{ width: colW['logged'] }} className="h-7 px-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {secs ? formatDuration(secs) : '—'}
          </span>
        </td>
      )}

      {/* Timer */}
      <td style={{ width: 32 }} className="h-7 px-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          <TaskTimerButton task={task} />
        </div>
      </td>
    </tr>
  )
}

// ─── Export (wrapped in Suspense for useSearchParams) ─────────────────────────

export default function ViewsPage() {
  return (
    <Suspense>
      <ViewsPageInner />
    </Suspense>
  )
}
