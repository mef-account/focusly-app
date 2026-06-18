'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchUserType } from '@/lib/queries/access'

/**
 * Returns the authenticated user's global type from profiles.type:
 *   'admin' — full access
 *   'user'  — project-scoped read-only access via project_members
 *   null    — still loading
 */
export function useCurrentUserRole(): 'admin' | 'user' | null {
  const { data } = useQuery({
    queryKey: ['user-role'],
    queryFn: fetchUserType,
    staleTime: 60_000,
  })
  return data ?? null
}

/**
 * True when the current user is NOT an admin (i.e. type = 'user').
 * Used to hide create/edit/delete UI throughout the app.
 */
export function useIsViewer(): boolean {
  return useCurrentUserRole() === 'user'
}

/** True when the current user is an admin. */
export function useIsAdmin(): boolean {
  return useCurrentUserRole() === 'admin'
}

/**
 * Returns the current user's role for a specific project.
 * Admins always get 'admin'. Regular users get 'viewer' if they're
 * in project_members for that project, otherwise null.
 *
 * Future-proof: project_members.role can later be 'editor' | 'viewer' | 'client', etc.
 */
export function useProjectRole(projectId: string): 'admin' | 'viewer' | null {
  const globalRole = useCurrentUserRole()

  const { data } = useQuery({
    queryKey: ['project-role', projectId],
    queryFn: async () => {
      if (!projectId) return null
      const supabase = createClient()
      const { data } = await supabase.rpc('get_project_role', { p_project_id: projectId })
      return (data ?? null) as 'viewer' | null
    },
    enabled: !!projectId && globalRole === 'user',
    staleTime: 60_000,
  })

  if (globalRole === 'admin') return 'admin'
  return data ?? null
}
