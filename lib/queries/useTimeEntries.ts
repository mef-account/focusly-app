import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toError } from '@/lib/supabase/errors'
import type { TimeEntry } from '@/types'

const supabase = createClient()

export function useTimeEntriesToday() {
  return useQuery({
    queryKey: ['time-entries', 'today'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, project:projects(id,name,color)')
        .eq('date', today)
        .order('created_at', { ascending: false })
      if (error) throw toError(error)
      return data as TimeEntry[]
    },
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useTimeEntries(from?: string, to?: string) {
  return useQuery({
    queryKey: ['time-entries', from, to],
    queryFn: async () => {
      let q = supabase
        .from('time_entries')
        .select('*, project:projects(id,name,color), task:tasks(id,title)')
        .order('date', { ascending: false })

      if (from) q = q.gte('date', from)
      if (to) q = q.lte('date', to)

      const { data, error } = await q
      if (error) throw toError(error)
      return data as TimeEntry[]
    },
  })
}

/** Returns a map of task_id → total seconds logged, for the given task ids. */
export function useTimeTotalsByTask(taskIds: string[]) {
  const sorted = [...taskIds].sort()
  return useQuery({
    queryKey: ['time-entries', 'totals-by-task', sorted],
    queryFn: async () => {
      const totals: Record<string, number> = {}
      if (sorted.length === 0) return totals

      const { data, error } = await supabase
        .from('time_entries')
        .select('task_id, duration_seconds')
        .in('task_id', sorted)

      if (error) throw toError(error)

      for (const row of data ?? []) {
        if (!row.task_id) continue
        totals[row.task_id] = (totals[row.task_id] ?? 0) + (row.duration_seconds ?? 0)
      }
      return totals
    },
    enabled: sorted.length > 0,
  })
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Partial<TimeEntry>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('time_entries')
        .insert({ ...entry, user_id: user!.id })
        .select()
        .single()
      if (error) throw toError(error)
      return data as TimeEntry
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TimeEntry> & { id: string }) => {
      const { error } = await supabase.from('time_entries').update(updates).eq('id', id)
      if (error) throw toError(error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id)
      if (error) throw toError(error)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['time-entries', 'today'] })
      const previous = queryClient.getQueryData(['time-entries', 'today'])
      queryClient.setQueryData(['time-entries', 'today'], (old: TimeEntry[] | undefined) =>
        old?.filter((e) => e.id !== id)
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['time-entries', 'today'], ctx?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}
