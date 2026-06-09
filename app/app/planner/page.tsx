'use client'

import { useState, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { format, addDays, addMinutes, isSameDay, parseISO, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, CalendarClock, Inbox as InboxIcon, Clock3, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskSheet } from '@/components/tasks/TaskSheet'
import { StatusIcon } from '@/components/tasks/StatusIcon'
import { PriorityIcon } from '@/components/tasks/PriorityIcon'
import { AssigneePicker } from '@/components/tasks/AssigneePicker'
import { TaskTimerButton } from '@/components/tracker/TaskTimerButton'
import { QuickCreateTaskDialog } from '@/components/planner/QuickCreateTaskDialog'
import { useTasks, useUpdateTask } from '@/lib/queries/useTasks'
import { useProjects } from '@/lib/queries/useProjects'
import { useProfiles } from '@/lib/queries/useProfiles'
import { useTimeTotalsByTask } from '@/lib/queries/useTimeEntries'
import { usePlannerStore } from '@/store/usePlannerStore'
import { useTaskPanelStore } from '@/store/useTaskPanelStore'
import { formatMinutes, formatDuration, cn } from '@/lib/utils'
import type { Task } from '@/types'

// ─── Time grid config ─────────────────────────────────────────────────────────
const START_MIN = 7 * 60   // 07:00
const END_MIN   = 22 * 60  // 22:00
const PX_PER_SLOT = 34     // px height per slot at base zoom
const DEFAULT_DUR = 30     // assumed minutes for tasks without an estimate
const DEFAULT_START_MIN = 9 * 60 // 09:00 — default position for tasks without a time
const GUTTER = 46          // px for time labels

const ZOOM_OPTIONS = [
  { label: '5m',  value: 5  },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h',  value: 60 },
]

function buildSlots(step: number): string[] {
  const out: string[] = []
  for (let m = START_MIN; m < END_MIN; m += step) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
}

/** Minutes since midnight — defaults to 09:00 when no ISO string is provided */
function minutesOfDay(iso: string | null | undefined): number {
  if (!iso) return DEFAULT_START_MIN
  const d = parseISO(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function combineDateAndTime(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

/** Assigns each overlapping task a column index + total columns (calendar-style). */
function computeDayLayout(
  tasks: Task[],
  pxPerMinute: number,
): Map<string, { col: number; cols: number }> {
  const layout = new Map<string, { col: number; cols: number }>()
  const minVisualMin = MIN_BLOCK_PX / pxPerMinute
  const events = tasks
    .map((t) => {
      const start = minutesOfDay(t.scheduled_start)
      const dur = Math.max(t.estimate_minutes ?? DEFAULT_DUR, minVisualMin)
      return { id: t.id, start, end: start + dur }
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  let group: { id: string; col: number }[] = []
  let columnEnds: number[] = []
  let groupEnd = -Infinity

  const flush = () => {
    const cols = columnEnds.length
    group.forEach((g) => layout.set(g.id, { col: g.col, cols }))
    group = []
    columnEnds = []
    groupEnd = -Infinity
  }

  for (const e of events) {
    if (group.length && e.start >= groupEnd) flush()
    let col = columnEnds.findIndex((end) => end <= e.start)
    if (col === -1) {
      col = columnEnds.length
      columnEnds.push(e.end)
    } else {
      columnEnds[col] = e.end
    }
    group.push({ id: e.id, col })
    groupEnd = Math.max(groupEnd, e.end)
  }
  if (group.length) flush()

  return layout
}

// ─── Draggable inbox card ─────────────────────────────────────────────────────
function InboxCard({
  task,
  selected,
  onSelect,
  onOpen,
  loggedSeconds,
  onAssigneeChange,
}: {
  task: Task
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  loggedSeconds?: number
  onAssigneeChange: (id: string | null) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={cn(
        'cursor-grab rounded-md border bg-card p-2 shadow-sm transition-colors active:cursor-grabbing',
        selected ? 'ring-2 ring-primary' : 'hover:bg-accent/50',
        isDragging && 'opacity-40'
      )}
    >
      <div className="flex items-center gap-1.5">
        {task.project ? (
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: task.project.color }} />
        ) : (
          <StatusIcon status={task.status} />
        )}
        <span className="flex-1 truncate text-[13px] font-medium">{task.title}</span>
        {task.priority !== 'none' && <PriorityIcon priority={task.priority} />}
      </div>
      <div className="mt-1.5 flex items-center justify-between pl-5">
        <div className="flex items-center gap-2">
          {task.project && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.project.color }} />
              {task.project.name}
            </span>
          )}
          {!!loggedSeconds && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Total logged">
              <Clock3 className="h-2.5 w-2.5" />
              {formatDuration(loggedSeconds)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TaskTimerButton task={task} />
          <AssigneePicker
            value={task.assignee_id}
            assignee={task.assignee}
            stopPropagation
            onChange={onAssigneeChange}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Droppable inbox zone (left) ──────────────────────────────────────────────
function DroppableInbox({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'inbox', data: { inbox: true } })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-1 flex-col overflow-hidden transition-colors',
        isOver && 'bg-primary/10 ring-1 ring-inset ring-primary/40'
      )}
    >
      {children}
    </div>
  )
}

// ─── Draggable week task pill (center) ────────────────────────────────────────
function WeekTaskPill({
  task,
  onOpen,
  loggedSeconds,
  onAssigneeChange,
}: {
  task: Task
  onOpen: () => void
  loggedSeconds?: number
  onAssigneeChange: (id: string | null) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `week::${task.id}` })
  const dur = task.estimate_minutes ?? DEFAULT_DUR

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onOpen() }}
      style={{ borderLeftColor: task.project?.color ?? 'var(--primary)' }}
      className={cn(
        'flex cursor-grab flex-col gap-0.5 rounded-md border-l-2 bg-card px-1.5 py-1 text-left shadow-sm active:cursor-grabbing hover:bg-accent/50',
        isDragging && 'opacity-40'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <StatusIcon status={task.status} />
          <span className="truncate text-[11px] font-medium leading-tight">{task.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-0.5 text-[10px] text-foreground" title="Estimate">
            <Timer className="h-2.5 w-2.5" />
            <span className="opacity-50">Est</span> {formatMinutes(dur)}
          </span>
          {!!loggedSeconds && (
            <span className="flex items-center gap-0.5 text-[10px] text-foreground" title="Total logged">
              <Clock3 className="h-2.5 w-2.5" />
              <span className="opacity-50">Log</span> {formatDuration(loggedSeconds)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        {task.project && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.project.color }} />
            {task.project.name}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <TaskTimerButton task={task} />
          <AssigneePicker
            value={task.assignee_id}
            assignee={task.assignee}
            stopPropagation
            onChange={onAssigneeChange}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Droppable weekday column (center) ────────────────────────────────────────
function WeekDayColumn({
  day,
  tasks,
  selected,
  onSelectDay,
  onOpenTask,
  timeTotals,
  onAssigneeChange,
}: {
  day: Date
  tasks: Task[]
  selected: boolean
  onSelectDay: () => void
  onOpenTask: (id: string) => void
  timeTotals: Record<string, number>
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${format(day, 'yyyy-MM-dd')}`,
    data: { date: day },
  })

  const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimate_minutes ?? DEFAULT_DUR), 0)
  const totalLoggedSeconds = tasks.reduce((sum, t) => sum + (timeTotals[t.id] ?? 0), 0)

  return (
    <div className="flex min-w-0 flex-1 flex-col border-r last:border-r-0">
      <button
        onClick={onSelectDay}
        className={cn(
          'flex flex-col items-center gap-0.5 border-b py-1.5 transition-colors hover:bg-accent/50',
          selected && 'bg-accent'
        )}
      >
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {format(day, 'EEE')}
        </span>
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
            isToday(day) && 'bg-primary text-primary-foreground'
          )}
        >
          {format(day, 'd')}
        </span>
        {totalMinutes > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Timer className="h-2.5 w-2.5" />
              <span className="opacity-60">Est</span> {formatMinutes(totalMinutes)}
            </span>
            {totalLoggedSeconds > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock3 className="h-2.5 w-2.5" />
                <span className="opacity-60">Log</span> {formatDuration(totalLoggedSeconds)}
              </span>
            )}
          </div>
        )}
      </button>

      <div
        ref={setNodeRef}
        className={cn('flex flex-1 flex-col gap-1 p-1 transition-colors', isOver && 'bg-primary/10')}
      >
        {tasks
          .sort((a, b) => {
            const order = ['urgent', 'high', 'medium', 'low', 'none']
            return order.indexOf(a.priority) - order.indexOf(b.priority)
          })
          .map((t) => (
            <WeekTaskPill
              key={t.id}
              task={t}
              onOpen={() => onOpenTask(t.id)}
              loggedSeconds={timeTotals[t.id]}
              onAssigneeChange={(id) => onAssigneeChange(t.id, id)}
            />
          ))}
      </div>
    </div>
  )
}

// ─── Droppable time slot (right panel) ────────────────────────────────────────
function TimeSlot({
  date,
  time,
  slotMinutes,
  height,
  onQuickCreate,
}: {
  date: Date
  time: string
  slotMinutes: number
  height: number
  onQuickCreate: (time: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${time}`,
    data: { date, time },
  })
  const isHour = time.endsWith(':00')
  const showLabel = slotMinutes >= 60 || isHour

  return (
    <div
      ref={setNodeRef}
      onClick={() => onQuickCreate(time)}
      style={{ height }}
      className={cn(
        'group/slot relative flex cursor-pointer items-start border-t border-dashed',
        isHour ? 'border-border' : 'border-border/40',
        isOver && 'bg-primary/10'
      )}
    >
      <span className="w-[46px] shrink-0 select-none -translate-y-1/2 pr-2 text-right text-[10px] tabular-nums text-muted-foreground">
        {showLabel ? time : ''}
      </span>
      <Plus className="absolute right-2 top-1 h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover/slot:opacity-100" />
    </div>
  )
}

// ─── Draggable day-detail block (right panel) ──────────────────────────────────
const BLOCK_LEFT = GUTTER + 4
const BLOCK_RIGHT_PAD = 6
const MIN_BLOCK_PX = 30

function DayBlock({
  task,
  onOpen,
  col = 0,
  cols = 1,
  pxPerMinute,
  snapMinutes,
  onResize,
  suppressClickRef,
}: {
  task: Task
  onOpen: () => void
  col?: number
  cols?: number
  pxPerMinute: number
  snapMinutes: number
  onResize: (id: string, minutes: number) => void
  suppressClickRef: MutableRefObject<boolean>
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `day::${task.id}` })
  const [resizing, setResizing] = useState(false)
  const [previewMin, setPreviewMin] = useState<number | null>(null)
  const previewRef = useRef<number | null>(null)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  const startMin = minutesOfDay(task.scheduled_start)
  const top = (startMin - START_MIN) * pxPerMinute
  const dur = previewMin ?? task.estimate_minutes ?? DEFAULT_DUR
  const height = Math.max(MIN_BLOCK_PX, dur * pxPerMinute - 2)

  const suppressNextClick = () => {
    suppressClickRef.current = true
    window.setTimeout(() => { suppressClickRef.current = false }, 150)
  }

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const startY = e.clientY
    const startDur = task.estimate_minutes ?? DEFAULT_DUR
    const snap = Math.max(5, snapMinutes)
    setResizing(true)

    const onMove = (ev: PointerEvent) => {
      const deltaMin = (ev.clientY - startY) / pxPerMinute
      let next = Math.round((startDur + deltaMin) / snap) * snap
      next = Math.max(snap, next)
      previewRef.current = next
      setPreviewMin(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const final = previewRef.current
      previewRef.current = null
      setResizing(false)
      setPreviewMin(null)
      suppressNextClick()
      if (final && final !== startDur) onResize(task.id, final)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleOpen = (e: React.MouseEvent) => {
    if (suppressClickRef.current || resizing || isDragging) return
    const start = pointerStartRef.current
    if (start) {
      const dx = Math.abs(e.clientX - start.x)
      const dy = Math.abs(e.clientY - start.y)
      if (dx > 4 || dy > 4) return
    }
    onOpen()
  }

  if (startMin < START_MIN || startMin >= END_MIN) return null

  const totalPad = BLOCK_LEFT + BLOCK_RIGHT_PAD
  const left  = `calc(${BLOCK_LEFT}px + (100% - ${totalPad}px) * ${col} / ${cols})`
  const width = `calc((100% - ${totalPad}px) / ${cols} - 2px)`

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        top,
        height,
        left,
        width,
        borderLeftColor: task.project?.color ?? 'var(--primary)',
      }}
      className={cn(
        'group/block absolute z-10 overflow-hidden rounded-md border border-l-2 bg-card shadow-sm hover:bg-accent/50',
        isDragging && 'opacity-40',
        resizing && 'z-20 ring-1 ring-primary'
      )}
    >
      <div
        {...listeners}
        onPointerDown={(e) => {
          pointerStartRef.current = { x: e.clientX, y: e.clientY }
          ;(listeners as Record<string, (e: React.PointerEvent) => void>)?.onPointerDown?.(e)
        }}
        onClick={handleOpen}
        className="flex h-[calc(100%-8px)] cursor-grab flex-col px-2 py-1 active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5">
          <StatusIcon status={task.status} />
          {task.scheduled_start && (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {format(parseISO(task.scheduled_start), 'HH:mm')}–
              {format(addMinutes(parseISO(task.scheduled_start), dur), 'HH:mm')}
            </span>
          )}
          <span className="truncate text-[12px] font-medium leading-tight">{task.title}</span>
          {(task.estimate_minutes || resizing) && (
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {formatMinutes(dur)}
            </span>
          )}
        </div>
      </div>

      <div
        onPointerDown={startResize}
        className="absolute inset-x-0 bottom-0 flex h-2 cursor-ns-resize items-end justify-center"
      >
        <div
          className={cn(
            'mb-0.5 h-1 w-8 rounded-full bg-foreground/30 transition-opacity',
            resizing ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'
          )}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlannerPage() {
  const { data: tasks = [] } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: profiles = [] } = useProfiles()
  const currentUserId = profiles[0]?.id ?? null
  const updateTask = useUpdateTask()
  const { open: openTaskSheet } = useTaskPanelStore()
  const {
    selectedDay,
    activeWeekStart,
    inboxFilter,
    setSelectedDay,
    nextWeek,
    prevWeek,
    goToToday,
    setInboxFilter,
  } = usePlannerStore()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [slotMinutes, setSlotMinutes] = useState(30)
  const [visibleDayIndices, setVisibleDayIndices] = useState<Set<number>>(() => {
    const jsDay = new Date().getDay()
    const todayIdx = jsDay === 0 ? 6 : jsDay - 1
    const indices = new Set<number>()
    if (todayIdx > 0) indices.add(todayIdx - 1)
    indices.add(todayIdx)
    if (todayIdx < 6) indices.add(todayIdx + 1)
    return indices
  })

  const blockClickSuppressRef = useRef(false)
  const [quickCreate, setQuickCreate] = useState<{ open: boolean; dueDate: string | null }>({
    open: false,
    dueDate: null,
  })

  const slots = useMemo(() => buildSlots(slotMinutes), [slotMinutes])

  // Measure the day-grid viewport so the grid fills it completely.
  const gridScrollRef = useRef<HTMLDivElement>(null)
  const [viewportH, setViewportH] = useState(0)
  useEffect(() => {
    const el = gridScrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight))
    ro.observe(el)
    setViewportH(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  const coveredMin    = slots.length * slotMinutes
  const basePxPerMin  = PX_PER_SLOT / slotMinutes
  const floorPxPerMin = viewportH > 0 ? viewportH / coveredMin : 0
  const pxPerMinute   = Math.max(basePxPerMin, floorPxPerMin)
  const slotHeight    = slotMinutes * pxPerMinute
  const dayHeight     = slots.length * slotHeight

  const toggleDay = (i: number) => {
    setVisibleDayIndices((prev) => {
      const next = new Set(prev)
      if (next.has(i) && next.size === 1) return prev
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(activeWeekStart, i)),
    [activeWeekStart]
  )

  const visibleWeekDays = useMemo(
    () => weekDays.filter((_, i) => visibleDayIndices.has(i)),
    [weekDays, visibleDayIndices]
  )

  // ── Inbox: in_progress tasks with no due_date ───────────────────────────────
  const inboxTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.due_date) return false
      if (t.status !== 'in_progress') return false
      if (currentUserId && t.assignee_id !== currentUserId) return false
      if (inboxFilter.projectId && t.project_id !== inboxFilter.projectId) return false
      return true
    })
  }, [tasks, inboxFilter, currentUserId])

  const inboxByPriority = useMemo(() => {
    const order = ['urgent', 'high', 'medium', 'low', 'none'] as const
    return order
      .map((priority) => ({ priority, items: inboxTasks.filter((t) => t.priority === priority) }))
      .filter((g) => g.items.length > 0)
  }, [inboxTasks])

  // ── Scheduled: tasks with a due_date, not cancelled ─────────────────────────
  const scheduledTasks = useMemo(
    () => tasks.filter((t) => t.due_date && t.status !== 'cancelled'),
    [tasks]
  )

  const { data: timeTotals = {} } = useTimeTotalsByTask(
    [...inboxTasks, ...scheduledTasks].map((t) => t.id)
  )

  // Week columns: group by due_date
  const tasksForDay = (day: Date) =>
    scheduledTasks.filter((t) => t.due_date === format(day, 'yyyy-MM-dd'))

  // Right panel: same filter — tasks positioned using scheduled_start for time,
  // defaulting to 09:00 when no time is set.
  const dayDetailTasks = useMemo(
    () => tasksForDay(selectedDay),
    [scheduledTasks, selectedDay] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const dayLayout = useMemo(
    () => computeDayLayout(dayDetailTasks, pxPerMinute),
    [dayDetailTasks, pxPerMinute]
  )

  const dayBudgetMinutes  = dayDetailTasks.reduce((sum, t) => sum + (t.estimate_minutes ?? DEFAULT_DUR), 0)
  const DAY_AVAILABLE_HOURS = (END_MIN - START_MIN) / 60
  const budgetPct = Math.min(100, Math.round((dayBudgetMinutes / (DAY_AVAILABLE_HOURS * 60)) * 100))

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null

  // ─── Keyboard shortcuts on the selected inbox task ─────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!selectedTaskId) return
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        updateTask.mutate({ id: selectedTaskId, due_date: format(new Date(), 'yyyy-MM-dd') })
        setSelectedTaskId(null)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        updateTask.mutate({ id: selectedTaskId, due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd') })
        setSelectedTaskId(null)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        updateTask.mutate({ id: selectedTaskId, due_date: null, status: 'in_progress' })
        setSelectedTaskId(null)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        openTaskSheet(selectedTaskId)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedTaskId, updateTask, openTaskSheet])

  function handleDragStart(e: DragStartEvent) {
    const rawId = e.active.id as string
    const taskId = rawId.includes('::') ? rawId.split('::')[1] : rawId
    setActiveId(taskId)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    blockClickSuppressRef.current = true
    window.setTimeout(() => { blockClickSuppressRef.current = false }, 150)

    const { active, over } = e
    if (!over) return

    const rawId = active.id as string
    const taskId = rawId.includes('::') ? rawId.split('::')[1] : rawId
    const data = over.data.current as { inbox?: boolean; date?: Date; time?: string } | undefined

    // Drop on inbox → remove due_date and set status to in_progress
    if (data?.inbox) {
      updateTask.mutate({ id: taskId, due_date: null, status: 'in_progress' })
      return
    }

    if (!data?.date) return

    const dateStr = format(data.date, 'yyyy-MM-dd')

    // If dropped on a time slot in the right panel, also set scheduled_start
    if (data.time) {
      updateTask.mutate({
        id: taskId,
        due_date: dateStr,
        scheduled_start: combineDateAndTime(data.date, data.time),
      })
      return
    }

    // Dropped on a week day column — set only due_date, preserve existing time if any
    updateTask.mutate({ id: taskId, due_date: dateStr })
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        blockClickSuppressRef.current = true
        window.setTimeout(() => { blockClickSuppressRef.current = false }, 150)
      }}
    >
      <div className="-m-6 flex h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ─── Left: Task Inbox ─── */}
        <div className="flex w-64 shrink-0 flex-col border-r">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <InboxIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Inbox</span>
            <span className="ml-auto text-xs text-muted-foreground">{inboxTasks.length}</span>
          </div>

          <div className="flex flex-col gap-2 border-b p-2">
            <Select
              value={inboxFilter.projectId ?? 'all'}
              onValueChange={(v) => setInboxFilter({ projectId: v === 'all' ? null : v })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DroppableInbox>
            <div className="flex-1 space-y-3 overflow-y-auto p-2">
              {inboxByPriority.length === 0 ? (
                <p className="px-1 py-8 text-center text-xs text-muted-foreground">
                  Nothing to schedule. Drag tasks here by clearing their date.
                </p>
              ) : (
                inboxByPriority.map((group) => (
                  <div key={group.priority} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-1">
                      <PriorityIcon priority={group.priority} />
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {group.priority === 'none' ? 'No priority' : group.priority}
                      </span>
                    </div>
                    {group.items.map((t) => (
                      <InboxCard
                        key={t.id}
                        task={t}
                        selected={selectedTaskId === t.id}
                        onSelect={() => setSelectedTaskId(t.id)}
                        onOpen={() => openTaskSheet(t.id)}
                        loggedSeconds={timeTotals[t.id]}
                        onAssigneeChange={(id) => updateTask.mutate({ id: t.id, assignee_id: id })}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </DroppableInbox>

          <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            <kbd className="font-sans">T</kbd> today · <kbd className="font-sans">→</kbd> tomorrow ·{' '}
            <kbd className="font-sans">⌫</kbd> unschedule · <kbd className="font-sans">↵</kbd> open
          </div>
        </div>

        {/* ─── Center: Weekly Calendar ─── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-col border-b">
            <div className="flex items-center gap-2 px-3 py-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 pb-2">
              {weekDays.map((day, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                    visibleDayIndices.has(i)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {format(day, 'EEE')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-1 overflow-y-auto">
            {visibleWeekDays.map((day) => (
              <WeekDayColumn
                key={day.toISOString()}
                day={day}
                tasks={tasksForDay(day)}
                selected={isSameDay(day, selectedDay)}
                onSelectDay={() => setSelectedDay(day)}
                onOpenTask={openTaskSheet}
                timeTotals={timeTotals}
                onAssigneeChange={(taskId, id) => updateTask.mutate({ id: taskId, assignee_id: id })}
              />
            ))}
          </div>
        </div>

        {/* ─── Right: Day Detail (time grid) ─── */}
        <div className="flex w-[28rem] shrink-0 flex-col border-l">
          <div className="border-b px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{format(selectedDay, 'EEEE, MMM d')}</span>
              <span className="text-[11px] text-muted-foreground">
                {formatMinutes(dayBudgetMinutes)} / {DAY_AVAILABLE_HOURS}h
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', budgetPct >= 100 ? 'bg-red-500' : 'bg-primary')}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            {/* Zoom / interval control */}
            <div className="mt-2 flex items-center gap-1">
              <span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground">Interval</span>
              <div className="flex items-center rounded-md border p-0.5">
                {ZOOM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSlotMinutes(opt.value)}
                    className={cn(
                      'rounded px-2 py-0.5 text-[11px] transition-colors',
                      slotMinutes === opt.value
                        ? 'bg-accent font-medium text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div ref={gridScrollRef} className="relative flex-1 overflow-y-auto">
            <div className="relative" style={{ height: dayHeight }}>
              {slots.map((time) => (
                <TimeSlot
                  key={time}
                  date={selectedDay}
                  time={time}
                  slotMinutes={slotMinutes}
                  height={slotHeight}
                  onQuickCreate={(t) =>
                    setQuickCreate({ open: true, dueDate: format(selectedDay, 'yyyy-MM-dd') })
                  }
                />
              ))}
              {dayDetailTasks.map((t) => {
                const pos = dayLayout.get(t.id)
                return (
                  <DayBlock
                    key={t.id}
                    task={t}
                    onOpen={() => openTaskSheet(t.id)}
                    col={pos?.col ?? 0}
                    cols={pos?.cols ?? 1}
                    pxPerMinute={pxPerMinute}
                    snapMinutes={slotMinutes}
                    suppressClickRef={blockClickSuppressRef}
                    onResize={(id, minutes) =>
                      updateTask.mutate({ id, estimate_minutes: minutes })
                    }
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drag preview */}
      <DragOverlay>
        {activeTask ? (
          <div className="rounded-md border bg-card p-2 shadow-lg">
            <div className="flex items-center gap-1.5">
              <StatusIcon status={activeTask.status} />
              <span className="text-[13px] font-medium">{activeTask.title}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      <QuickCreateTaskDialog
        open={quickCreate.open}
        onOpenChange={(o) => setQuickCreate((s) => ({ ...s, open: o }))}
        dueDate={quickCreate.dueDate}
      />
      <TaskSheet />
    </DndContext>
  )
}
