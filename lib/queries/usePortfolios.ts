import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getAccessScope, buildProjectFilter } from '@/lib/queries/access'
import type { Portfolio } from '@/types'

const supabase = createClient()

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const scope = await getAccessScope()
      if (!scope.userId) return []

      // Get accessible projects first, then derive portfolios from them
      const filter = buildProjectFilter(scope)
      if (!filter) return []

      const { data: projects } = await supabase
        .from('projects').select('portfolio_id').or(filter)
      const portfolioIds = [...new Set(
        (projects ?? [])
          .map((p: { portfolio_id: string | null }) => p.portfolio_id)
          .filter(Boolean) as string[]
      )]
      if (portfolioIds.length === 0) return []

      // Also include all portfolios in owned workspaces (even empty ones)
      const portfolioFilter: string[] = [`id.in.(${portfolioIds.join(',')})`]
      if (scope.ownedWorkspaceIds.length > 0)
        portfolioFilter.push(`workspace_id.in.(${scope.ownedWorkspaceIds.join(',')})`)

      const { data, error } = await supabase
        .from('portfolios')
        .select('*, owner:profiles!owner_id(id,name,avatar_url)')
        .or(portfolioFilter.join(','))
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
