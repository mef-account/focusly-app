import { create } from 'zustand'

interface TaskPanelStore {
  activeTaskId: string | null
  open: (id: string) => void
  close: () => void
}

export const useTaskPanelStore = create<TaskPanelStore>()((set) => ({
  activeTaskId: null,
  open: (id) => set({ activeTaskId: id }),
  close: () => set({ activeTaskId: null }),
}))
