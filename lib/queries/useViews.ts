import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { SavedView } from '@/types'

const supabase = createClient()

export function useViews() {
  return useQuery({
    queryKey: ['views'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('views')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as SavedView[]
    },
  })
}

export function useCreateView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (view: Omit<SavedView, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('views').insert(view).select().single()
      if (error) throw error
      return data as SavedView
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['views'] }),
  })
}

export function useUpdateView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SavedView> & { id: string }) => {
      const { error } = await supabase
        .from('views')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['views'] }),
  })
}

export function useDeleteView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('views').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['views'] }),
  })
}
