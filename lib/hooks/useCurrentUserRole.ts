'use client'

import { useQuery } from '@tanstack/react-query'
import { getAccessScope } from '@/lib/queries/access'

/**
 * Returns 'admin' when the user owns workspaces, 'viewer' when they only
 * have granted project access (invited user), null while loading.
 */
export function useCurrentUserRole(): 'admin' | 'viewer' | null {
  const { data } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const scope = await getAccessScope()
      if (!scope.userId) return null
      // Admin owns workspaces; viewer has granted projects but no owned workspaces with content
      if (scope.ownedWorkspaceIds.length > 0) return 'admin' as const
      if (scope.grantedProjectIds.length > 0) return 'viewer' as const
      return 'admin' as const  // default: treat as admin (new account, no projects yet)
    },
    staleTime: 30_000,
  })

  return data ?? null
}

/** Convenience hook — true when the user is a read-only viewer */
export function useIsViewer(): boolean {
  return useCurrentUserRole() === 'viewer'
}
