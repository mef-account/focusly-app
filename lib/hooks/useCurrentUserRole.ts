'use client'

import { useQuery } from '@tanstack/react-query'
import { getAccessScope } from '@/lib/queries/access'

/**
 * Returns the current user's role.
 * 'admin'  — normal account owner
 * 'viewer' — invited read-only member (has a workspace_members viewer row)
 * null     — still loading
 */
export function useCurrentUserRole(): 'admin' | 'viewer' | null {
  const { data } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const scope = await getAccessScope()
      if (!scope.userId) return null
      return scope.isViewer ? ('viewer' as const) : ('admin' as const)
    },
    staleTime: 60_000,
  })

  return data ?? null
}

/** Convenience hook — true when the user is a read-only viewer */
export function useIsViewer(): boolean {
  return useCurrentUserRole() === 'viewer'
}
