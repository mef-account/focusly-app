import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface AccessScope {
  userId: string | null
  /** true when the user was invited as a read-only viewer */
  isViewer: boolean
  /** workspace IDs the user owns (for admins) */
  ownedWorkspaceIds: string[]
  /** project IDs the viewer has been explicitly granted */
  accessibleProjectIds: string[]
}

/**
 * Resolves what the current user is allowed to see.
 *
 * A user is treated as a VIEWER if they have a `workspace_members` row with
 * role = 'viewer'. (Supabase auto-creates a personal "My Workspace" for every
 * signup, so workspace ownership cannot be used to detect admins.)
 *
 * Viewers only see projects explicitly granted via `project_access`.
 * Admins see everything in the workspaces they own.
 */
export async function getAccessScope(): Promise<AccessScope> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { userId: null, isViewer: false, ownedWorkspaceIds: [], accessibleProjectIds: [] }
  }

  const { data: memberRows } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', user.id)
  const isViewer = (memberRows ?? []).some((m: { role: string }) => m.role === 'viewer')

  if (isViewer) {
    const { data: access } = await supabase
      .from('project_access')
      .select('project_id')
      .eq('user_id', user.id)
    const accessibleProjectIds = (access ?? []).map((a: { project_id: string }) => a.project_id)
    return { userId: user.id, isViewer: true, ownedWorkspaceIds: [], accessibleProjectIds }
  }

  const { data: owned } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
  const ownedWorkspaceIds = (owned ?? []).map((w: { id: string }) => w.id)
  return { userId: user.id, isViewer: false, ownedWorkspaceIds, accessibleProjectIds: [] }
}
