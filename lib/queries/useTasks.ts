import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toError } from '@/lib/supabase/errors'
import { toast } from 'sonner'
import type { Task } from '@/types'

const supabase = createClient()

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', projectId ?? 'all'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let q = supabase
        .from('tasks')
        .select('*, project:projects(id,name,color,workspace_id,portfolio_id), workspace:workspaces(id,name,identifier), assignee:profiles!assignee_id(id,name,avatar_url), labels(id,name,color)')
        .is('parent_task_id', null)
        .order('created_at', { ascending: false })

      if (projectId) {
        q = q.eq('project_id', projectId)
      } else {
        // Filter to user's accessible workspaces + explicit project access
        const { data: owned } = await supabase
          .from('workspaces').select('id').eq('owner_id', user.id)
        const ownedWsIds = (owned ?? []).map((w: { id: string }) => w.id)

        const { data: memberships } = await supabase
          .from('workspace_members').select('workspace_id').eq('user_id', user.id)
        const memberWsIds = (memberships ?? []).map((m: { workspace_id: string }) => m.workspace_id)

        const { data: access } = await supabase
          .from('project_access').select('project_id').eq('user_id', user.id)
        const accessProjIds = (access ?? []).map((a: { project_id: string }) => a.project_id)

        const wsIds = [...new Set([...ownedWsIds, ...memberWsIds])]
        const filters: string[] = []
        if (wsIds.length > 0) filters.push(`project_id.in.(select:id:projects?workspace_id=in.(${wsIds.join(',')}))`)
        if (accessProjIds.length > 0) filters.push(`project_id.in.(${accessProjIds.join(',')})`)

        if (filters.length === 0) return []

        // Simpler: filter by workspace via join on project
        // Since tasks have project_id, we filter projects first then get task project_ids
        const projFilters: string[] = []
        if (wsIds.length > 0) projFilters.push(`workspace_id.in.(${wsIds.join(',')})`)
        if (accessProjIds.length > 0) projFilters.push(`id.in.(${accessProjIds.join(',')})`)

        const { data: accessibleProjects } = await supabase
          .from('projects').select('id').or(projFilters.join(','))
        const accessibleProjIds = (accessibleProjects ?? []).map((p: { id: string }) => p.id)
        if (accessibleProjIds.length === 0) return []
        q = q.in('project_id', accessibleProjIds)
      }

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

export function useTasksDueTomorrow() {
  return useQuery({
    queryKey: ['tasks', 'due-tomorrow'],
    queryFn: async () => {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(id,name,color)')
        .eq('due_date', tomorrow)
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
      if (!task.workspace_id) throw new Error('A workspace is required to create a task.')

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
