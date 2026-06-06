import { create } from 'zustand'

interface QuickCreateStore {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useQuickCreateStore = create<QuickCreateStore>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
