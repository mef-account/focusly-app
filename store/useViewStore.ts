import { create } from 'zustand'
import type { ViewFilter } from '@/types'

interface ViewStore {
  activeViewId: string | null
  pendingFilters: ViewFilter[]
  pendingColumns: string[]
  isDirty: boolean
  setActiveViewId: (id: string | null) => void
  setPendingFilters: (filters: ViewFilter[]) => void
  setPendingColumns: (columns: string[]) => void
  markDirty: () => void
  resetPending: () => void
}

export const useViewStore = create<ViewStore>()((set) => ({
  activeViewId: null,
  pendingFilters: [],
  pendingColumns: [],
  isDirty: false,

  setActiveViewId: (id) => set({ activeViewId: id, isDirty: false }),
  setPendingFilters: (filters) => set({ pendingFilters: filters, isDirty: true }),
  setPendingColumns: (columns) => set({ pendingColumns: columns, isDirty: true }),
  markDirty: () => set({ isDirty: true }),
  resetPending: () =>
    set({ pendingFilters: [], pendingColumns: [], isDirty: false }),
}))
