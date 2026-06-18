import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/supabase/errors'
import { toast } from 'sonner'
import type { Portfolio } from '@/types'

const supabase = createClient()

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      // RLS returns only portfolios this user is allowed to see
      const { data, error } = await supabase
        .from('portfolios')
        .select('*, owner:profiles!owner_id(id,name,avatar_url)')
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
    onError: (err) => toast.error(friendlyError(err)),
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
    onError: (err) => toast.error(friendlyError(err)),
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
