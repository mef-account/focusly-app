import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  isBefore,
  isToday,
  isTomorrow,
  isThisWeek,
  startOfToday,
  format,
} from 'date-fns'
import type { DueDateBucket, TaskStatus, TaskPriority } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Duration formatting ─────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

/** Parses "6:17:52", "17:11", "2h 30m", "45m", "90" → seconds */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase()
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    const s = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0
    if (m >= 60 || s >= 60) return null
    return h * 3600 + m * 60 + s
  }
  const minutes = parseEstimate(trimmed)
  return minutes !== null ? minutes * 60 : null
}

/** Parses "2h 30m", "1h", "45m", "90" (treated as minutes) → minutes */
export function parseEstimate(input: string): number | null {
  const trimmed = input.trim().toLowerCase()
  const hoursMatch = trimmed.match(/(\d+)\s*h/)
  const minsMatch = trimmed.match(/(\d+)\s*m/)
  const rawNumber = trimmed.match(/^(\d+)$/)

  if (!hoursMatch && !minsMatch && !rawNumber) return null

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0
  const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0
  const raw = rawNumber ? parseInt(rawNumber[1], 10) : 0

  return hoursMatch || minsMatch ? hours * 60 + mins : raw
}

// ─── Due date buckets (for Views grouping) ────────────────────────────────────

export function getDueDateBucket(dueDate: Date | string | null): DueDateBucket {
  if (!dueDate) return 'Empty'
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  if (isBefore(d, startOfToday())) return 'Before today'
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'This week'
  return 'Later'
}

export const DUE_DATE_BUCKET_ORDER: DueDateBucket[] = [
  'Before today',
  'Today',
  'Tomorrow',
  'This week',
  'Later',
  'Empty',
]

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(date: string | Date | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd/MM/yyyy')
}

// ─── Initials fallback for avatars ────────────────────────────────────────────

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Status badge colors ──────────────────────────────────────────────────────

export const STATUS_CLASSES: Record<TaskStatus, string> = {
  backlog: 'bg-gray-100 text-gray-600',
  todo: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500 line-through',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

// ─── Priority badge colors ────────────────────────────────────────────────────

export const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-600',
  none: 'bg-gray-100 text-gray-500',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'No priority',
}
