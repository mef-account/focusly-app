'use client'

import { useTimerStore } from '@/store/useTimerStore'
import { useCreateTimeEntry } from '@/lib/queries/useTimeEntries'

interface TimerTask {
  id: string
  title: string
  project_id?: string | null
}

/**
 * Centralizes per-task start/stop logic with a single global running timer.
 * Saves a time_entry when a timer is stopped or switched to another task.
 */
export function useTaskTimer() {
  const createEntry = useCreateTimeEntry()

  async function saveCurrent() {
    const s = useTimerStore.getState()
    if (!s.startedAt) return
    const duration = Math.floor((Date.now() - s.startedAt) / 1000)
    if (duration < 1) return

    await createEntry.mutateAsync({
      task_id: s.taskId,
      project_id: s.projectId,
      description: s.description || null,
      tag: s.tag,
      started_at: new Date(s.startedAt).toISOString(),
      stopped_at: new Date().toISOString(),
      duration_seconds: duration,
      date: new Date(s.startedAt).toISOString().split('T')[0],
    })
  }

  /** Toggle the timer for a given task. */
  async function toggle(task: TimerTask) {
    const s = useTimerStore.getState()
    const isThisTaskRunning = s.running && s.taskId === task.id

    if (isThisTaskRunning) {
      s.stop()
      await saveCurrent()
      s.reset()
      return
    }

    // Switching from another running task → save it first
    if (s.running) {
      s.stop()
      await saveCurrent()
    }

    useTimerStore.getState().startTask({
      taskId: task.id,
      description: task.title,
      projectId: task.project_id ?? null,
      tag: 'work',
    })
  }

  /** Stop and save whatever is currently running (used by the standalone widget). */
  async function stopActive() {
    const s = useTimerStore.getState()
    if (!s.running) return
    s.stop()
    await saveCurrent()
    s.reset()
  }

  return { toggle, stopActive }
}
