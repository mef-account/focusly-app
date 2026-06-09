import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toError } from '@/lib/supabase/errors'
import type { Note } from '@/types'

const supabase = createClient()

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw toError(error)
      return data as Note[]
    },
  })
}

export function useNotesByTask(taskId?: string) {
  return useQuery({
    queryKey: ['notes', 'by-task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
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
      const { data, error } = await supabase
        .from('notes')
        .insert({ title: 'Untitled', content: '', tag: 'personal', ...note, user_id: user!.id })
        .select()
        .single()
      if (error) throw toError(error)
      return data as Note
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
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
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previous = queryClient.getQueryData(['notes'])
      queryClient.setQueryData(['notes'], (old: Note[] | undefined) =>
        old?.map((n) => (n.id === id ? { ...n, ...updates } : n))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['notes'], ctx?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
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
