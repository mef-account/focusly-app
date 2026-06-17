import { create } from 'zustand'

interface QuickCreateOptions {
  projectId?: string | null
  workspaceId?: string | null
}

interface QuickCreateStore {
  isOpen: boolean
  defaultProjectId: string | null
  defaultWorkspaceId: string | null
  open: (opts?: QuickCreateOptions) => void
  close: () => void
}

export const useQuickCreateStore = create<QuickCreateStore>()((set) => ({
  isOpen: false,
  defaultProjectId: null,
  defaultWorkspaceId: null,
  open: (opts) => set({
    isOpen: true,
    defaultProjectId: opts?.projectId ?? null,
    defaultWorkspaceId: opts?.workspaceId ?? null,
  }),
  close: () => set({ isOpen: false, defaultProjectId: null, defaultWorkspaceId: null }),
}))
