import { createClient } from '@/lib/supabase/client'

/**
 * Reads the user's type directly from profiles.type.
 *
 * 'admin' — full access to all workspaces/projects/tasks
 * 'user'  — access only to projects explicitly shared via project_members (read-only)
 */
export async function fetchUserType(): Promise<'admin' | 'user'> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'user'
  const { data } = await supabase
    .from('profiles')
    .select('type')
    .eq('id', user.id)
    .single()
  return (data?.type ?? 'user') as 'admin' | 'user'
}
