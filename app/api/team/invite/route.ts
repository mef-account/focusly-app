import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Returns the authenticated user and the workspace IDs they own, or null. */
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
  return { user, adminClient, ownedWorkspaceIds }
}

// POST — invite a viewer (account-wide; membership is attached to one owned workspace)
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const ctx = await getAdminContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, adminClient, ownedWorkspaceIds } = ctx

    if (ownedWorkspaceIds.length === 0) {
      return NextResponse.json({ error: 'You do not own any workspace to invite into' }, { status: 403 })
    }
    const membershipWorkspaceId = ownedWorkspaceIds[0]

    // Invite the user via Supabase Auth (sends magic-link email)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://focusly-app-ten.vercel.app'
    const confirmUrl = `${siteUrl}/auth/confirm?next=${encodeURIComponent('/app/dashboard')}`

    let invitedUserId: string | null = null
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: confirmUrl }
    )
    if (inviteError) {
      // If the user already exists, look them up instead of failing
      const { data: list } = await adminClient.auth.admin.listUsers()
      const existing = list?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      )
      if (!existing) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 })
      }
      invitedUserId = existing.id
    } else {
      invitedUserId = inviteData.user.id
    }

    // Upsert workspace_members row (idempotent)
    const { error: memberError } = await adminClient
      .from('workspace_members')
      .upsert(
        {
          workspace_id: membershipWorkspaceId,
          user_id: invitedUserId,
          email: email.toLowerCase(),
          role: 'viewer',
          invited_by: user.id,
        },
        { onConflict: 'workspace_id,user_id' }
      )
    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: invitedUserId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


// GET — list all viewers the admin has invited (account-wide)
export async function GET() {
  try {
    const ctx = await getAdminContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, adminClient, ownedWorkspaceIds } = ctx

    if (ownedWorkspaceIds.length === 0) return NextResponse.json([])

    // Members invited by this admin (across any of their workspaces)
    const { data: members, error } = await adminClient
      .from('workspace_members')
      .select(`
        id,
        user_id,
        email,
        role,
        created_at,
        profiles!workspace_members_user_id_fkey (id, name, avatar_url)
      `)
      .eq('invited_by', user.id)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Deduplicate by user_id (a viewer may have multiple membership rows)
    const seen = new Set<string>()
    const uniqueMembers = (members ?? []).filter((m: any) => {
      if (seen.has(m.user_id)) return false
      seen.add(m.user_id)
      return true
    })

    // Attach project_ids for each member
    const userIds = uniqueMembers.map((m: any) => m.user_id)
    const { data: access } = await adminClient
      .from('project_access')
      .select('user_id, project_id')
      .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

    const accessMap: Record<string, string[]> = {}
    for (const row of access ?? []) {
      if (!accessMap[row.user_id]) accessMap[row.user_id] = []
      accessMap[row.user_id].push(row.project_id)
    }

    const result = uniqueMembers.map((m: any) => ({
      ...m,
      project_ids: accessMap[m.user_id] ?? [],
    }))

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


// DELETE — remove a viewer entirely (all memberships + project access)
export async function DELETE(req: NextRequest) {
  try {
    const { memberId } = await req.json()
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    }

    const ctx = await getAdminContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, adminClient, ownedWorkspaceIds } = ctx

    // Find the membership row and confirm it was invited by this admin
    const { data: member } = await adminClient
      .from('workspace_members')
      .select('id, user_id, invited_by')
      .eq('id', memberId)
      .single()
    if (!member || member.invited_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove this viewer's access to all of the admin's projects
    if (ownedWorkspaceIds.length > 0) {
      const { data: adminProjects } = await adminClient
        .from('projects')
        .select('id')
        .in('workspace_id', ownedWorkspaceIds)
      const adminProjectIds = (adminProjects ?? []).map((p: { id: string }) => p.id)
      if (adminProjectIds.length > 0) {
        await adminClient
          .from('project_access')
          .delete()
          .eq('user_id', member.user_id)
          .in('project_id', adminProjectIds)
      }
    }

    // Remove all membership rows for this viewer that this admin created
    const { error } = await adminClient
      .from('workspace_members')
      .delete()
      .eq('user_id', member.user_id)
      .eq('invited_by', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
