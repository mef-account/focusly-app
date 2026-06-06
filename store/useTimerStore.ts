import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StartTaskOptions {
  taskId: string
  description: string
  projectId: string | null
  tag?: 'work' | 'personal'
}

interface TimerStore {
  running: boolean
  seconds: number
  description: string
  projectId: string | null
  taskId: string | null
  tag: 'work' | 'personal'
  startedAt: number | null // epoch ms
  start: () => void
  startTask: (opts: StartTaskOptions) => void
  stop: () => void
  reset: () => void
  tick: () => void
  setDescription: (description: string) => void
  setProjectId: (projectId: string | null) => void
  setTaskId: (taskId: string | null) => void
  setTag: (tag: 'work' | 'personal') => void
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      running: false,
      seconds: 0,
      description: '',
      projectId: null,
      taskId: null,
      tag: 'work',
      startedAt: null,

      start: () => {
        const now = Date.now()
        set({ running: true, startedAt: now })
      },
      startTask: ({ taskId, description, projectId, tag = 'work' }) =>
        set({
          running: true,
          startedAt: Date.now(),
          seconds: 0,
          taskId,
          description,
          projectId,
          tag,
        }),
      stop: () => set({ running: false }),
      reset: () =>
        set({
          running: false,
          seconds: 0,
          description: '',
          projectId: null,
          taskId: null,
          tag: 'work',
          startedAt: null,
        }),
      tick: () => {
        const { running, startedAt } = get()
        if (running && startedAt) {
          set({ seconds: Math.floor((Date.now() - startedAt) / 1000) })
        }
      },
      setDescription: (description) => set({ description }),
      setProjectId: (projectId) => set({ projectId }),
      setTaskId: (taskId) => set({ taskId }),
      setTag: (tag) => set({ tag }),
    }),
    { name: 'focusly-timer' }
  )
)
