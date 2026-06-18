import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Returns the authenticated admin, their owned project IDs, or null. */
async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const adminClient = createAdminClient()
  const { data: workspaces } = await adminClient
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
  const ownedWorkspaceIds = (workspaces ?? []).map((w: { id: string }) => w.id)

  let adminProjectIds: string[] = []
  if (ownedWorkspaceIds.length > 0) {
    const { data: projects } = await adminClient
      .from('projects')
      .select('id')
      .in('workspace_id', ownedWorkspaceIds)
    adminProjectIds = (projects ?? []).map((p: { id: string }) => p.id)
  }
  return { user, adminClient, adminProjectIds }
}

// POST — set the exact set of projects a viewer can access (across all admin workspaces)
export async function POST(req: NextRequest) {
  try {
    const { userId, projectIds } = await req.json()
    if (!userId || !Array.isArray(projectIds)) {
      return NextResponse.json({ error: 'userId and projectIds are required' }, { status: 400 })
    }

    const ctx = await getAdminContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, adminClient, adminProjectIds } = ctx

    // Only allow granting projects the admin actually owns
    const allowed = new Set(adminProjectIds)
    const validProjectIds = (projectIds as string[]).filter((id) => allowed.has(id))

    // Replace all of this viewer's access among the admin's projects
    if (adminProjectIds.length > 0) {
      await adminClient
        .from('project_access')
        .delete()
        .eq('user_id', userId)
        .in('project_id', adminProjectIds)
    }

    if (validProjectIds.length > 0) {
      const rows = validProjectIds.map((projectId) => ({
        user_id: userId,
        project_id: projectId,
        granted_by: user.id,
      }))
      const { error } = await adminClient.from('project_access').insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
