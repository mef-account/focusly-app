import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

/**
 * Returns the two sets of projects a user can see:
 *
 *  ownedWorkspaceIds   — workspaces where owner_id = user.id
 *                        (used to show all projects in those workspaces)
 *  grantedProjectIds   — projects explicitly shared via project_access
 *                        (used for invited viewers)
 *
 * No role detection needed — we just fetch both and combine.
 * Admins have many owned workspaces and no granted rows.
 * Viewers have one empty owned workspace and some granted rows.
 */
export interface AccessScope {
  userId: string | null
  ownedWorkspaceIds: string[]
  grantedProjectIds: string[]
}

export async function getAccessScope(): Promise<AccessScope> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, ownedWorkspaceIds: [], grantedProjectIds: [] }

  const [{ data: owned }, { data: access }] = await Promise.all([
    supabase.from('workspaces').select('id').eq('owner_id', user.id),
    supabase.from('project_access').select('project_id').eq('user_id', user.id),
  ])

  return {
    userId: user.id,
    ownedWorkspaceIds: (owned ?? []).map((w: { id: string }) => w.id),
    grantedProjectIds: (access ?? []).map((a: { project_id: string }) => a.project_id),
  }
}

/** Build a Supabase OR filter covering owned-workspace projects + granted projects */
export function buildProjectFilter(scope: AccessScope): string | null {
  const parts: string[] = []
  if (scope.ownedWorkspaceIds.length > 0)
    parts.push(`workspace_id.in.(${scope.ownedWorkspaceIds.join(',')})`)
  if (scope.grantedProjectIds.length > 0)
    parts.push(`id.in.(${scope.grantedProjectIds.join(',')})`)
  return parts.length > 0 ? parts.join(',') : null
}
