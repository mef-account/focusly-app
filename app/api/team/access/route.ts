import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function verifyOwner(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', user.id)
    .single()
  return workspace ? user : null
}

// POST — grant a set of project_ids to a user
export async function POST(req: NextRequest) {
  try {
    const { userId, projectIds, workspaceId } = await req.json()
    if (!userId || !workspaceId || !Array.isArray(projectIds)) {
      return NextResponse.json({ error: 'userId, workspaceId, and projectIds are required' }, { status: 400 })
    }

    const user = await verifyOwner(workspaceId)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    // Delete existing access for this user in this workspace, then re-insert
    // First, get all project IDs in this workspace
    const { data: workspaceProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId)

    const workspaceProjectIds = (workspaceProjects ?? []).map((p: any) => p.id)

    if (workspaceProjectIds.length > 0) {
      await adminClient
        .from('project_access')
        .delete()
        .eq('user_id', userId)
        .in('project_id', workspaceProjectIds)
    }

    // Insert new access rows
    if (projectIds.length > 0) {
      const rows = projectIds.map((projectId: string) => ({
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
