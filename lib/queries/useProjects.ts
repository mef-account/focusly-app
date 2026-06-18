import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'

const supabase = createClient()

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Workspace IDs the user owns (admin)
      const { data: owned } = await supabase
        .from('workspaces').select('id').eq('owner_id', user.id)
      const ownedWsIds = (owned ?? []).map((w: { id: string }) => w.id)

      // Workspace IDs the user is a member of (viewer)
      const { data: memberships } = await supabase
        .from('workspace_members').select('workspace_id').eq('user_id', user.id)
      const memberWsIds = (memberships ?? []).map((m: { workspace_id: string }) => m.workspace_id)

      // Explicit project IDs the viewer has access to
      const { data: access } = await supabase
        .from('project_access').select('project_id').eq('user_id', user.id)
      const accessProjIds = (access ?? []).map((a: { project_id: string }) => a.project_id)

      const wsIds = [...new Set([...ownedWsIds, ...memberWsIds])]
      if (wsIds.length === 0 && accessProjIds.length === 0) return []

      // Build OR filter: projects in user's workspaces OR explicitly granted projects
      const filters: string[] = []
      if (wsIds.length > 0) filters.push(`workspace_id.in.(${wsIds.join(',')})`)
      if (accessProjIds.length > 0) filters.push(`id.in.(${accessProjIds.join(',')})`)

      const { data, error } = await supabase
        .from('projects')
        .select('*, tasks(status, due_date)')
        .or(filters.join(','))
        .order('created_at', { ascending: false })
      if (error) throw error

      return (data ?? []).map((p: any) => {
        const tasks: { status: string; due_date: string | null }[] = p.tasks ?? []
        const dueDates = tasks.map((t) => t.due_date).filter(Boolean).sort() as string[]
        return {
          ...p,
          tasks: undefined,
          task_count: tasks.length,
          done_count: tasks.filter((t) => t.status === 'done').length,
          min_due_date: dueDates[0] ?? null,
          max_due_date: dueDates.at(-1) ?? null,
        } as Project
      })
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Project
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (project: Partial<Project> & { name: string; workspace_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('projects')
        .insert({ color: '#534AB7', ...project, created_by: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { error } = await supabase.from('projects').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}
