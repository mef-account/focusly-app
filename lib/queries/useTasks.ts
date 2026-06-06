import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toError } from '@/lib/supabase/errors'
import type { Task } from '@/types'

const supabase = createClient()

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', projectId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select('*, project:projects(id,name,color), assignee:profiles!assignee_id(id,name,avatar_url), labels(id,name,color)')
        .is('parent_task_id', null)
        .order('created_at', { ascending: false })

      if (projectId) q = q.eq('project_id', projectId)

      const { data, error } = await q
      if (error) throw toError(error)
      return data as Task[]
    },
  })
}

export function useTasksDueToday() {
  return useQuery({
    queryKey: ['tasks', 'due-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(id,name,color), assignee:profiles!assignee_id(id,name,avatar_url)')
        .eq('due_date', today)
        .not('status', 'in', '("done","cancelled")')
        .order('priority', { ascending: true })
      if (error) throw error
      return data as Task[]
    },
  })
}

/** Tasks active today: due today OR scheduled (scheduled_start) today */
export function useTasksActiveToday() {
  return useQuery({
    queryKey: ['tasks', 'active-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const todayEnd = `${today}T23:59:59`

      const [dueRes, scheduledRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, estimate_minutes')
          .eq('due_date', today)
          .not('status', 'in', '("done","cancelled")'),
        supabase
          .from('tasks')
          .select('id, estimate_minutes')
          .gte('scheduled_start', today)
          .lte('scheduled_start', todayEnd)
          .not('status', 'in', '("done","cancelled")'),
      ])

      if (dueRes.error) throw toError(dueRes.error)
      if (scheduledRes.error) throw toError(scheduledRes.error)

      // Merge, deduplicate by id
      const map = new Map<string, { id: string; estimate_minutes: number | null }>()
      for (const t of [...(dueRes.data ?? []), ...(scheduledRes.data ?? [])]) {
        map.set(t.id, t)
      }
      return Array.from(map.values())
    },
  })
}

export function useTasksDueThisWeek() {
  return useQuery({
    queryKey: ['tasks', 'due-this-week'],
    queryFn: async () => {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const in7Days = new Date(today)
      in7Days.setDate(today.getDate() + 7)
      const in7DaysStr = in7Days.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(id,name,color)')
        .gt('due_date', todayStr)
        .lte('due_date', in7DaysStr)
        .not('status', 'in', '("done","cancelled")')
        .order('due_date', { ascending: true })
      if (error) throw error
      return data as Task[]
    },
  })
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['tasks', 'my-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(id,name,color), assignee:profiles!assignee_id(id,name,avatar_url), labels(id,name,color)')
        .eq('assignee_id', user.id)
        .not('status', 'in', '("done","cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data as Task[]
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueriesData({ queryKey: ['tasks'] })
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old: Task[] | undefined) =>
        old?.map((t) => (t.id === id ? { ...t, ...updates } : t))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = { ...task, created_by: task.created_by ?? user?.id ?? null }
      const { data, error } = await supabase.from('tasks').insert(payload).select().single()
      if (error) throw toError(error)
      return data as Task
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
