import { create } from 'zustand'

export type NoteViewMode = 'edit' | 'split' | 'preview'

interface OpenNoteOptions {
  fullscreen?: boolean
  mode?: NoteViewMode
}

interface NotePanelStore {
  activeNoteId: string | null
  fullscreen: boolean
  mode: NoteViewMode
  openNote: (id: string, options?: OpenNoteOptions) => void
  close: () => void
  setFullscreen: (v: boolean) => void
}

export const useNotePanelStore = create<NotePanelStore>((set) => ({
  activeNoteId: null,
  fullscreen: false,
  mode: 'preview',
  openNote: (id, options = {}) =>
    set({
      activeNoteId: id,
      fullscreen: options.fullscreen ?? false,
      mode: options.mode ?? 'preview',
    }),
  close: () => set({ activeNoteId: null, fullscreen: false, mode: 'preview' }),
  setFullscreen: (fullscreen) => set({ fullscreen }),
}))
