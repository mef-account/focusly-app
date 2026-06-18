import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Portfolio } from '@/types'

const supabase = createClient()

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Workspace IDs the user owns (admin)
      const { data: owned } = await supabase
        .from('workspaces').select('id').eq('owner_id', user.id)
      const ownedIds = (owned ?? []).map((w: { id: string }) => w.id)

      if (ownedIds.length > 0) {
        // Admin: all portfolios in owned workspaces
        const { data, error } = await supabase
          .from('portfolios')
          .select('*, owner:profiles!owner_id(id,name,avatar_url)')
          .in('workspace_id', ownedIds)
          .order('created_at', { ascending: false })
        if (error) throw error
        return data as Portfolio[]
      }

      // Viewer: only portfolios that contain their granted projects
      const { data: access } = await supabase
        .from('project_access').select('project_id').eq('user_id', user.id)
      const accessProjIds = (access ?? []).map((a: { project_id: string }) => a.project_id)
      if (accessProjIds.length === 0) return []

      const { data: projects } = await supabase
        .from('projects').select('portfolio_id').in('id', accessProjIds)
      const portfolioIds = [...new Set(
        (projects ?? []).map((p: { portfolio_id: string | null }) => p.portfolio_id).filter(Boolean) as string[]
      )]
      if (portfolioIds.length === 0) return []

      const { data, error } = await supabase
        .from('portfolios')
        .select('*, owner:profiles!owner_id(id,name,avatar_url)')
        .in('id', portfolioIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Portfolio[]
    },
  })
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (portfolio: { name: string; workspace_id: string; description?: string | null; color?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('portfolios')
        .insert({ color: '#534AB7', ...portfolio, owner_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as Portfolio
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Portfolio> & { id: string }) => {
      const { error } = await supabase.from('portfolios').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portfolios').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}
