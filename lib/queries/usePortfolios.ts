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

      // Get workspace IDs the user owns (admin)
      const { data: owned } = await supabase
        .from('workspaces').select('id').eq('owner_id', user.id)
      const ownedIds = (owned ?? []).map((w: { id: string }) => w.id)

      // Get workspace IDs the user is a member of (viewer)
      const { data: memberships } = await supabase
        .from('workspace_members').select('workspace_id').eq('user_id', user.id)
      const memberIds = (memberships ?? []).map((m: { workspace_id: string }) => m.workspace_id)

      const wsIds = [...new Set([...ownedIds, ...memberIds])]
      if (wsIds.length === 0) return []

      const { data, error } = await supabase
        .from('portfolios')
        .select('*, owner:profiles!owner_id(id,name,avatar_url)')
        .in('workspace_id', wsIds)
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
