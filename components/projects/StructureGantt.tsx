'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInDays,
  parseISO,
  format,
  getWeek,
  isWithinInterval,
  startOfDay,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

export const GANTT_TOOLBAR_H = 'h-8'

const ROW_H = 'h-7'

export type StructureGanttRow =
  | { kind: 'portfolio'; portfolio: { id: string }; projectCount: number }
  | { kind: 'project'; project: Project }
  | { kind: 'empty'; message: string }
  | { kind: 'unassigned_header'; count: number }

type GanttScale = 'day' | 'week' | 'month'

const BASE_WIDTH: Record<GanttScale, number> = {
  day: 32,
  week: 96,
  month: 120,
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25

interface GanttColumn {
  date: Date
  width: number
  label: string
}

interface WeekBand {
  key: string
  weekNum: number
  width: number
}

function buildWeekBands(columns: GanttColumn[]): WeekBand[] {
  const bands: WeekBand[] = []
  let currentWeek: number | null = null
  let currentWidth = 0
  let currentKey = ''

  for (const col of columns) {
    const weekNum = getWeek(col.date, { weekStartsOn: 1 })
    const key = `${format(col.date, 'yyyy')}-W${weekNum}`

    if (weekNum !== currentWeek) {
      if (currentWeek !== null) {
        bands.push({ key: currentKey, weekNum: currentWeek, width: currentWidth })
      }
      currentWeek = weekNum
      currentWidth = col.width
      currentKey = key
    } else {
      currentWidth += col.width
    }
  }

  if (currentWeek !== null) {
    bands.push({ key: currentKey, weekNum: currentWeek, width: currentWidth })
  }

  return bands
}

function buildColumns(
  scale: GanttScale,
  windowStart: Date,
  windowEnd: Date,
  zoom: number,
): { columns: GanttColumn[]; timelineWidth: number } {
  const colWidth = BASE_WIDTH[scale] * zoom

  let intervals: Date[]
  let labelFn: (d: Date) => string

  switch (scale) {
    case 'day':
      intervals = eachDayOfInterval({ start: windowStart, end: windowEnd })
      labelFn = (d) => format(d, 'd')
      break
    case 'week':
      intervals = eachWeekOfInterval(
        { start: windowStart, end: windowEnd },
        { weekStartsOn: 1 },
      )
      labelFn = (d) => `W${getWeek(d, { weekStartsOn: 1 })} · ${format(d, 'MMM')}`
      break
    case 'month':
      intervals = eachMonthOfInterval({ start: windowStart, end: windowEnd })
      labelFn = (d) => format(d, 'MMM yyyy')
      break
  }

  const columns = intervals.map((date) => ({
    date,
    width: colWidth,
    label: labelFn(date),
  }))

  return {
    columns,
    timelineWidth: columns.length * colWidth,
  }
}

function getBarPixels(
  project: Project,
  windowStart: Date,
  windowEnd: Date,
  timelineWidth: number,
) {
  if (!project.min_due_date || !project.max_due_date) return null

  const totalDays = Math.max(differenceInDays(windowEnd, windowStart), 1)
  const start = parseISO(project.min_due_date)
  const end = parseISO(project.max_due_date)
  const offsetDays = differenceInDays(start, windowStart)
  const spanDays = Math.max(differenceInDays(end, start), 0)

  const leftPx = (offsetDays / totalDays) * timelineWidth
  const widthPx = Math.max((spanDays / totalDays) * timelineWidth, 4)

  return { leftPx, widthPx }
}

function getTodayLeftPx(windowStart: Date, windowEnd: Date, timelineWidth: number) {
  const today = startOfDay(new Date())
  if (!isWithinInterval(today, { start: windowStart, end: windowEnd })) return null

  const totalDays = Math.max(differenceInDays(windowEnd, windowStart), 1)
  const offsetDays = differenceInDays(today, windowStart)
  return (offsetDays / totalDays) * timelineWidth
}

function GanttBarRow({
  project,
  windowStart,
  windowEnd,
  timelineWidth,
  columns,
}: {
  project: Project
  windowStart: Date
  windowEnd: Date
  timelineWidth: number
  columns: GanttColumn[]
}) {
  const bar = getBarPixels(project, windowStart, windowEnd, timelineWidth)

  return (
    <div className={cn(ROW_H, 'relative flex items-center border-b border-border/40')}>
      {/* Grid lines */}
      <div className="absolute inset-0 flex pointer-events-none">
        {columns.map((col) => (
          <div
            key={col.date.toISOString()}
            className="shrink-0 border-r border-border/30 h-full"
            style={{ width: col.width }}
          />
        ))}
      </div>

      {bar ? (
        <div
          className="absolute top-1/2 z-[1] h-3.5 -translate-y-1/2 rounded-sm shadow-sm"
          style={{
            left: bar.leftPx,
            width: bar.widthPx,
            backgroundColor: project.color,
          }}
          title={`${project.min_due_date} → ${project.max_due_date}`}
        />
      ) : (
        <span className="relative z-[1] pl-2 text-xs text-muted-foreground">—</span>
      )}
    </div>
  )
}

interface StructureGanttProps {
  rows: StructureGanttRow[]
  windowStart: Date
  windowEnd: Date
}

export function StructureGantt({ rows, windowStart, windowEnd }: StructureGanttProps) {
  const [scale, setScale] = useState<GanttScale>('week')
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startX: 0, scrollLeft: 0 })
  const isDraggingRef = useRef(false)

  const { columns, timelineWidth } = useMemo(
    () => buildColumns(scale, windowStart, windowEnd, zoom),
    [scale, windowStart, windowEnd, zoom],
  )

  const todayLeftPx = useMemo(
    () => getTodayLeftPx(windowStart, windowEnd, timelineWidth),
    [windowStart, windowEnd, timelineWidth],
  )

  const weekBands = useMemo(
    () => (scale === 'day' ? buildWeekBands(columns) : []),
    [scale, columns],
  )

  const handleDragStart = useCallback((clientX: number) => {
    const el = scrollRef.current
    if (!el) return
    isDraggingRef.current = true
    setIsDragging(true)
    dragRef.current = { startX: clientX, scrollLeft: el.scrollLeft }
  }, [])

  const handleDragMove = useCallback((clientX: number) => {
    const el = scrollRef.current
    if (!el || !isDraggingRef.current) return
    const dx = clientX - dragRef.current.startX
    el.scrollLeft = dragRef.current.scrollLeft - dx
  }, [])

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX)
    const onMouseUp = () => handleDragEnd()

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // Center today line in the visible chart area on load and when scale/zoom changes
  useEffect(() => {
    const el = scrollRef.current
    if (!el || todayLeftPx === null) return

    const centerToday = () => {
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll <= 0) return
      const target = todayLeftPx - el.clientWidth / 2
      el.scrollLeft = Math.max(0, Math.min(target, maxScroll))
    }

    centerToday()
    requestAnimationFrame(centerToday)
  }, [todayLeftPx, timelineWidth, scale, zoom])

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0">
      {/* Scale toolbar */}
      <div className={cn(GANTT_TOOLBAR_H, 'flex items-center justify-end gap-1 px-2 border-b shrink-0')}>
        {(['day', 'week', 'month'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={scale === s ? 'secondary' : 'ghost'}
            className="h-6 px-2 text-xs capitalize"
            onClick={() => setScale(s)}
          >
            {s}
          </Button>
        ))}
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-8 text-center text-[10px] tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Scrollable timeline — drag to pan left/right */}
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-x-auto overflow-y-hidden select-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onMouseDown={(e) => {
          if (e.button !== 0) return
          handleDragStart(e.clientX)
        }}
        onTouchStart={(e) => {
          if (e.touches.length !== 1) return
          handleDragStart(e.touches[0].clientX)
        }}
        onTouchMove={(e) => {
          if (!isDraggingRef.current || e.touches.length !== 1) return
          e.preventDefault()
          handleDragMove(e.touches[0].clientX)
        }}
        onTouchEnd={handleDragEnd}
      >
        <div className="relative" style={{ minWidth: timelineWidth }}>
          {/* Today marker spans header + rows */}
          {todayLeftPx !== null && (
            <div
              className="absolute inset-y-0 z-20 w-px bg-red-800 pointer-events-none"
              style={{ left: todayLeftPx }}
            />
          )}

          {/* Column headers */}
          {scale === 'day' ? (
            <div className={cn(ROW_H, 'sticky top-0 z-10 flex flex-col border-b bg-background')}>
              <div className="flex h-3.5 border-b border-border/40">
                {weekBands.map((band) => (
                  <div
                    key={band.key}
                    className="shrink-0 flex items-center justify-center border-r border-border/40 bg-muted/30 text-[9px] font-semibold tabular-nums text-muted-foreground"
                    style={{ width: band.width }}
                  >
                    W{band.weekNum}
                  </div>
                ))}
              </div>
              <div className="flex h-3.5">
                {columns.map((col) => (
                  <div
                    key={col.date.toISOString()}
                    className="shrink-0 border-r border-border/40 flex items-center justify-center text-[10px] font-medium tabular-nums text-muted-foreground"
                    style={{ width: col.width }}
                    title={format(col.date, 'EEE, MMM d')}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={cn(ROW_H, 'flex border-b sticky top-0 bg-background z-10')}>
              {columns.map((col) => (
                <div
                  key={col.date.toISOString()}
                  className="shrink-0 border-r border-border/40 px-1.5 flex items-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate"
                  style={{ width: col.width }}
                  title={col.label}
                >
                  {col.label}
                </div>
              ))}
            </div>
          )}

          {/* Rows */}
          {rows.map((row, i) => {
            if (row.kind === 'portfolio' || row.kind === 'unassigned_header') {
              return (
                <div
                  key={`gantt-header-${i}`}
                  className={cn(ROW_H, 'relative border-b border-border/40 bg-muted/20')}
                >
                  <div className="absolute inset-0 flex pointer-events-none">
                    {columns.map((col) => (
                      <div
                        key={col.date.toISOString()}
                        className="shrink-0 border-r border-border/20 h-full"
                        style={{ width: col.width }}
                      />
                    ))}
                  </div>
                </div>
              )
            }
            if (row.kind === 'project') {
              return (
                <GanttBarRow
                  key={`gantt-proj-${row.project.id}`}
                  project={row.project}
                  windowStart={windowStart}
                  windowEnd={windowEnd}
                  timelineWidth={timelineWidth}
                  columns={columns}
                />
              )
            }
            if (row.kind === 'empty') {
              return (
                <div key={`gantt-empty-${i}`} className={cn(ROW_H, 'relative border-b border-border/40')}>
                  <div className="absolute inset-0 flex pointer-events-none">
                    {columns.map((col) => (
                      <div
                        key={col.date.toISOString()}
                        className="shrink-0 border-r border-border/20 h-full"
                        style={{ width: col.width }}
                      />
                    ))}
                  </div>
                </div>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}
