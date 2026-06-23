import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { toError } from '@/lib/supabase/errors'
import type { Note } from '@/types'

const supabase = createClient()

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function todayTitle() {
  return format(new Date(), 'EEEE, MMMM d')
}

export function useDailyNotes() {
  return useQuery({
    queryKey: ['notes', 'daily'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('note_type', 'daily')
        .order('note_date', { ascending: false })
      if (error) throw toError(error)
      return data as Note[]
    },
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useTodayDailyNote() {
  const today = todayStr()
  return useQuery({
    queryKey: ['notes', 'daily', today],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('note_type', 'daily')
        .eq('note_date', today)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw toError(error)
      return data as Note | null
    },
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useEnsureTodayDailyNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be signed in.')

      const today = todayStr()
      const { data: existing, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('note_type', 'daily')
        .eq('note_date', today)
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError) throw toError(fetchError)
      if (existing) return existing as Note

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          note_type: 'daily',
          note_date: today,
          title: todayTitle(),
          content: '',
          task_id: null,
          project_id: null,
        })
        .select()
        .single()

      if (error) throw toError(error)
      return data as Note
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'daily'] })
      queryClient.invalidateQueries({ queryKey: ['notes', 'daily', todayStr()] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not create daily note.')
    },
  })
}

/** @deprecated Use useDailyNotes for the journal page */
export function useNotes() {
  return useDailyNotes()
}

export function useNotesByTask(taskId?: string) {
  return useQuery({
    queryKey: ['notes', 'by-task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('note_type', 'task')
        .eq('task_id', taskId!)
        .order('updated_at', { ascending: false })
      if (error) throw toError(error)
      return data as Note[]
    },
    enabled: !!taskId,
  })
}

/** Returns a map of task_id → number of notes, for the given task ids. */
export function useNoteCountsByTask(taskIds: string[]) {
  const sorted = [...taskIds].sort()
  return useQuery({
    queryKey: ['notes', 'counts-by-task', sorted],
    queryFn: async () => {
      const counts: Record<string, number> = {}
      if (sorted.length === 0) return counts

      const { data, error } = await supabase
        .from('notes')
        .select('task_id')
        .eq('note_type', 'task')
        .in('task_id', sorted)

      if (error) throw toError(error)

      for (const row of data ?? []) {
        if (!row.task_id) continue
        counts[row.task_id] = (counts[row.task_id] ?? 0) + 1
      }
      return counts
    },
    enabled: sorted.length > 0,
  })
}

export function useNotesByProject(projectId?: string) {
  return useQuery({
    queryKey: ['notes', 'by-project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('note_type', 'project')
        .eq('project_id', projectId!)
        .order('updated_at', { ascending: false })
      if (error) throw toError(error)
      return data as Note[]
    },
    enabled: !!projectId,
  })
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw toError(error)
      return data as Note
    },
    enabled: !!id,
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (note: Partial<Note>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be signed in to create a note.')
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: 'Untitled',
          content: '',
          task_id: null,
          project_id: null,
          note_date: null,
          ...note,
          user_id: user.id,
        })
        .select()
        .single()
      if (error) throw toError(error)
      return data as Note
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      if (data.note_type === 'daily') {
        queryClient.invalidateQueries({ queryKey: ['notes', 'daily'] })
      }
      if (data.project_id) {
        queryClient.invalidateQueries({ queryKey: ['notes', 'by-project', data.project_id] })
      }
      if (data.task_id) {
        queryClient.invalidateQueries({ queryKey: ['notes', 'by-task', data.task_id] })
        queryClient.invalidateQueries({ queryKey: ['notes', 'counts-by-task'] })
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not create note.')
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Note> & { id: string }) => {
      const { error } = await supabase.from('notes').update(updates).eq('id', id)
      if (error) throw toError(error)
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', 'daily'] })
      const previous = queryClient.getQueryData(['notes', 'daily'])
      queryClient.setQueryData(['notes', 'daily'], (old: Note[] | undefined) =>
        old?.map((n) => (n.id === id ? { ...n, ...updates } : n))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['notes', 'daily'], ctx?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw toError(error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  })
}
