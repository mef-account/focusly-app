import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { TaskActivity } from '@/types'

const supabase = createClient()

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_activity')
        .select('*, user:profiles(id,name,avatar_url), task:tasks(id,title)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as TaskActivity[]
    },
  })
}
