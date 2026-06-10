import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toError } from '@/lib/supabase/errors'
import { toast } from 'sonner'
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
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(id,name,color), assignee:profiles!assignee_id(id,name,avatar_url)')
        .lte('due_date', today)
        .not('status', 'in', '("done","cancelled")')
        .order('due_date', { ascending: true })
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
      const today = format(new Date(), 'yyyy-MM-dd')
      const todayEnd = `${today}T23:59:59`

      const SELECT = '*, project:projects(id,name,color), assignee:profiles!assignee_id(id,name,avatar_url)'

      const [dueRes, scheduledRes] = await Promise.all([
        supabase
          .from('tasks')
          .select(SELECT)
          .eq('due_date', today)
          .not('status', 'in', '("done","cancelled")')
          .order('priority', { ascending: true }),
        supabase
          .from('tasks')
          .select(SELECT)
          .gte('scheduled_start', today)
          .lte('scheduled_start', todayEnd)
          .not('status', 'in', '("done","cancelled")')
          .order('priority', { ascending: true }),
      ])

      if (dueRes.error) throw toError(dueRes.error)
      if (scheduledRes.error) throw toError(scheduledRes.error)

      // Merge, deduplicate by id
      const map = new Map<string, Task>()
      for (const t of [...(dueRes.data ?? []), ...(scheduledRes.data ?? [])]) {
        map.set(t.id, t as Task)
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
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd')
      const in7Days = new Date(today)
      in7Days.setDate(today.getDate() + 7)
      const in7DaysStr = format(in7Days, 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(id,name,color)')
        .gte('due_date', tomorrowStr)
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
      // Look up current cached task for status guards
      if (updates.status === 'todo' || updates.status === 'in_progress') {
        const allCached = queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] })
        let current: Task | undefined
        for (const [, data] of allCached) {
          current = (data as Task[] | undefined)?.find((t) => t.id === id)
          if (current) break
        }

        const estimate  = updates.estimate_minutes ?? current?.estimate_minutes
        const project   = updates.project_id       ?? current?.project_id
        const priority  = updates.priority         ?? current?.priority
        const assignee  = updates.assignee_id      ?? current?.assignee_id

        if (updates.status === 'todo') {
          if (!estimate) throw new Error('A task needs an estimate before moving to Todo.')
          if (!project)  throw new Error('A task needs a project before moving to Todo.')
        }

        if (updates.status === 'in_progress') {
          if (!estimate)                        throw new Error('A task needs an estimate before starting.')
          if (!project)                         throw new Error('A task needs a project before starting.')
          if (!priority || priority === 'none') throw new Error('A task needs a priority before starting.')
          if (!assignee)                        throw new Error('A task needs an assignee before starting.')
        }
      }

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
    onError: (err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast.error(err instanceof Error ? err.message : 'Could not update task.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      if (task.status === 'in_progress') {
        if (!task.estimate_minutes)                      throw new Error('A task needs an estimate before starting.')
        if (!task.project_id)                            throw new Error('A task needs a project before starting.')
        if (!task.priority || task.priority === 'none')  throw new Error('A task needs a priority before starting.')
        if (!task.assignee_id)                           throw new Error('A task needs an assignee before starting.')
      }

      const { data: { user } } = await supabase.auth.getUser()
      const payload = { ...task, created_by: task.created_by ?? user?.id ?? null }
      const { data, error } = await supabase.from('tasks').insert(payload).select().single()
      if (error) throw toError(error)
      return data as Task
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not create task.')
    },
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
