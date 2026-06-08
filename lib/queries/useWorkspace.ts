import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Workspace } from '@/types'

const supabase = createClient()

export function useWorkspace() {
  return useQuery({
    queryKey: ['workspace'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .single()
      if (error) throw error
      return data as Workspace
    },
  })
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Workspace[]
    },
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (workspace: { name: string; type?: 'personal' | 'work' }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('workspaces')
        .insert({ type: 'work', ...workspace, owner_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as Workspace
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; type?: 'personal' | 'work' }) => {
      const { error } = await supabase.from('workspaces').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workspaces').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}
