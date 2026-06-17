import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, workspaceId } = await req.json()
    if (!email || !workspaceId) {
      return NextResponse.json({ error: 'email and workspaceId are required' }, { status: 400 })
    }

    // Verify the requesting user owns the workspace
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: workspace, error: wsError } = await adminClient
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', workspaceId)
      .eq('owner_id', user.id)
      .single()
    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 })
    }

    // Invite the user via Supabase Auth (sends magic-link email)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://focusly-app-ten.vercel.app'
    const confirmUrl = `${siteUrl}/auth/confirm?next=${encodeURIComponent('/app/dashboard')}`
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: confirmUrl }
    )
    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    const invitedUserId = inviteData.user.id

    // Upsert workspace_members row (idempotent if invited again)
    const { error: memberError } = await adminClient
      .from('workspace_members')
      .upsert(
        {
          workspace_id: workspaceId,
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


export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Verify the requesting user owns the workspace
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('owner_id', user.id)
      .single()
    if (!workspace) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    // Get all members for this workspace
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
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get project_access for each member
    const userIds = (members ?? []).map((m: any) => m.user_id)
    const { data: access } = await adminClient
      .from('project_access')
      .select('user_id, project_id')
      .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

    // Attach project_ids to each member
    const accessMap: Record<string, string[]> = {}
    for (const row of access ?? []) {
      if (!accessMap[row.user_id]) accessMap[row.user_id] = []
      accessMap[row.user_id].push(row.project_id)
    }

    const result = (members ?? []).map((m: any) => ({
      ...m,
      project_ids: accessMap[m.user_id] ?? [],
    }))

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const { memberId, workspaceId } = await req.json()
    if (!memberId || !workspaceId) {
      return NextResponse.json({ error: 'memberId and workspaceId are required' }, { status: 400 })
    }

    // Verify ownership
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('owner_id', user.id)
      .single()
    if (!workspace) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
