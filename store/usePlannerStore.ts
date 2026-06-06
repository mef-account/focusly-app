import { create } from 'zustand'
import { startOfWeek, addWeeks, subWeeks } from 'date-fns'

interface InboxFilter {
  projectId: string | null
  priority: string | null
  label: string | null
}

interface PlannerStore {
  selectedDay: Date
  activeWeekStart: Date
  inboxFilter: InboxFilter
  setSelectedDay: (day: Date) => void
  nextWeek: () => void
  prevWeek: () => void
  goToToday: () => void
  setInboxFilter: (filter: Partial<InboxFilter>) => void
  resetInboxFilter: () => void
}

const defaultFilter: InboxFilter = {
  projectId: null,
  priority: null,
  label: null,
}

export const usePlannerStore = create<PlannerStore>()((set) => ({
  selectedDay: new Date(),
  activeWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
  inboxFilter: defaultFilter,

  setSelectedDay: (day) => set({ selectedDay: day }),
  nextWeek: () =>
    set((state) => ({
      activeWeekStart: addWeeks(state.activeWeekStart, 1),
    })),
  prevWeek: () =>
    set((state) => ({
      activeWeekStart: subWeeks(state.activeWeekStart, 1),
    })),
  goToToday: () =>
    set({
      selectedDay: new Date(),
      activeWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  setInboxFilter: (filter) =>
    set((state) => ({
      inboxFilter: { ...state.inboxFilter, ...filter },
    })),
  resetInboxFilter: () => set({ inboxFilter: defaultFilter }),
}))
