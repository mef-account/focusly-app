'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'

const supabase = createClient()

/**
 * Returns the current user's role in the active workspace.
 * 'admin'  — user owns the workspace
 * 'viewer' — user is an invited member
 * null     — loading or no workspace
 */
export function useCurrentUserRole(): 'admin' | 'viewer' | null {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  const { data } = useQuery({
    queryKey: ['user-role', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Check if user owns the workspace
      const { data: owned } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', activeWorkspaceId)
        .eq('owner_id', user.id)
        .maybeSingle()
      if (owned) return 'admin' as const

      // Check workspace_members
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', activeWorkspaceId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (membership) return membership.role as 'admin' | 'viewer'

      return null
    },
    enabled: !!activeWorkspaceId,
    staleTime: 60_000,
  })

  return data ?? null
}

/** Convenience hook — true when the user is a read-only viewer */
export function useIsViewer(): boolean {
  return useCurrentUserRole() === 'viewer'
}
