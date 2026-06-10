'use client'

import { useMemo, useState, useEffect } from 'react'
import { Square, Timer, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimerStore } from '@/store/useTimerStore'
import { useTaskTimer } from '@/lib/hooks/useTaskTimer'
import { useTimeEntriesToday, useDeleteTimeEntry, useUpdateTimeEntry, useTimeEntries } from '@/lib/queries/useTimeEntries'
import { ManualEntryDialog } from '@/components/tracker/ManualEntryDialog'
import { formatDuration, parseDuration, cn } from '@/lib/utils'
import type { TimeEntry } from '@/types'
import { startOfWeek, endOfWeek, format } from 'date-fns'

function RunningBanner() {
  const running = useTimerStore((s) => s.running)
  const description = useTimerStore((s) => s.description)
  const seconds = useTimerStore((s) => s.seconds)
  const { stopActive } = useTaskTimer()

  if (!running) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card/50 px-5 py-4 text-muted-foreground">
        <Timer className="h-5 w-5" />
        <p className="text-sm">
          No timer running. Press the <span className="font-medium">Start</span> button on any task to begin tracking.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{description || 'Untitled task'}</p>
          <p className="text-xs text-muted-foreground">Tracking now</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-2xl font-bold tabular-nums">
          {formatDuration(seconds)}
        </span>
        <Button variant="destructive" size="sm" className="gap-1.5" onClick={stopActive}>
          <Square className="h-3.5 w-3.5" /> Stop
        </Button>
      </div>
    </div>
  )
}

function DurationCell({ entry }: { entry: TimeEntry }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(formatDuration(entry.duration_seconds ?? 0))
  const updateEntry = useUpdateTimeEntry()
  const seconds = entry.duration_seconds ?? 0

  useEffect(() => {
    if (!editing) setValue(formatDuration(seconds))
  }, [seconds, editing])

  function save() {
    const parsed = parseDuration(value)
    if (parsed !== null && parsed >= 1 && parsed !== seconds) {
      updateEntry.mutate({ id: entry.id, duration_seconds: parsed })
    } else {
      setValue(formatDuration(seconds))
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="w-24 rounded border bg-background px-2 py-0.5 text-right font-mono text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') {
            setValue(formatDuration(seconds))
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className="font-mono tabular-nums hover:text-primary hover:underline transition-colors"
      onClick={() => setEditing(true)}
      title="Click to edit duration"
    >
      {formatDuration(seconds)}
    </button>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

export default function TrackerPage() {
  const { data: todayEntries, isLoading } = useTimeEntriesToday()
  const deleteEntry = useDeleteTimeEntry()
  const [manualOpen, setManualOpen] = useState(false)

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const { data: weekEntries } = useTimeEntries(weekStart, weekEnd)

  const todayTotal = useMemo(
    () => todayEntries?.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0) ?? 0,
    [todayEntries]
  )
  const weekTotal = useMemo(
    () => weekEntries?.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0) ?? 0,
    [weekEntries]
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Time Tracker</h2>
          <p className="text-sm text-muted-foreground">Start a timer from any task, or log time manually.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setManualOpen(true)}>
          <Plus className="h-4 w-4" /> Manual entry
        </Button>
      </div>

      <RunningBanner />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Today" value={formatDuration(todayTotal)} />
        <StatCard label="This week" value={formatDuration(weekTotal)} />
        <StatCard label="Entries today" value={String(todayEntries?.length ?? 0)} />
      </div>

      {/* Today's log */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Today&apos;s log</h3>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !todayEntries?.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No time logged today yet
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 font-medium">Tag</th>
                <th className="px-4 py-2 font-medium text-right">Duration</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {todayEntries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-2.5 font-medium">{entry.description || 'Untitled'}</td>
                  <td className="px-4 py-2.5">
                    {entry.project ? (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.project.color }} />
                        <span className="text-muted-foreground">{entry.project.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {entry.tag && (
                      <Badge variant="secondary" className="text-[10px] capitalize">{entry.tag}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DurationCell entry={entry} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => deleteEntry.mutate(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ManualEntryDialog open={manualOpen} onOpenChange={setManualOpen} />
    </div>
  )
}
