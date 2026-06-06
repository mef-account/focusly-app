import { create } from 'zustand'

interface NotePanelStore {
  activeNoteId: string | null
  fullscreen: boolean
  openNote: (id: string, fullscreen?: boolean) => void
  close: () => void
  setFullscreen: (v: boolean) => void
}

export const useNotePanelStore = create<NotePanelStore>((set) => ({
  activeNoteId: null,
  fullscreen: false,
  openNote: (id, fullscreen = false) => set({ activeNoteId: id, fullscreen }),
  close: () => set({ activeNoteId: null, fullscreen: false }),
  setFullscreen: (fullscreen) => set({ fullscreen }),
}))
