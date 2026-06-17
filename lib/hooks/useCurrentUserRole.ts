'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useWorkspaces } from '@/lib/queries/useWorkspace'

/**
 * Returns the current user's role in the active workspace.
 * 'admin'  — user owns the workspace
 * 'viewer' — user is an invited member
 * null     — still loading
 */
export function useCurrentUserRole(): 'admin' | 'viewer' | null {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  if (isLoading || !userId || !activeWorkspaceId) return null

  // Check if user owns the active workspace
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  if (activeWorkspace && activeWorkspace.owner_id === userId) return 'admin'

  // If user has any workspaces and owns at least one, they are admin globally
  const ownsAny = workspaces.some((w) => w.owner_id === userId)
  if (ownsAny) return 'admin'

  // User is in the workspaces list but doesn't own any → viewer
  if (workspaces.length > 0) return 'viewer'

  return null
}

/** Convenience hook — true when the user is a read-only viewer */
export function useIsViewer(): boolean {
  return useCurrentUserRole() === 'viewer'
}
