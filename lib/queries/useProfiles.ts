import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toError } from '@/lib/supabase/errors'
import type { Profile } from '@/types'

const supabase = createClient()

/** Assignable members. With owner-only RLS this returns the current user. */
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, timezone, created_at')
        .order('name', { ascending: true })
      if (error) throw toError(error)
      return data as Profile[]
    },
  })
}
