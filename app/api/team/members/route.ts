import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Ensures the caller is an authenticated admin (profiles.type = 'admin'). */
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('type')
    .eq('id', user.id)
    .single()
  if (profile?.type !== 'admin') return null
  return { user, adminClient }
}

// ─── GET — list all project_members (flat); optionally filter by projectId ────
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { adminClient } = ctx

    const projectId = req.nextUrl.searchParams.get('projectId')

    let query = adminClient
      .from('project_members')
      .select('project_id, user_id, role, created_at, profiles!project_members_user_id_fkey(id, name, avatar_url)')
      .order('created_at', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with auth email
    const { data: users } = await adminClient.auth.admin.listUsers()
    const emailMap: Record<string, string> = {}
    for (const u of users?.users ?? []) {
      if (u.email) emailMap[u.id] = u.email
    }

    const result = (data ?? []).map((m: any) => ({
      project_id: m.project_id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      email: emailMap[m.user_id] ?? null,
      profiles: m.profiles,
    }))

    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

// ─── POST — invite user by email and add to one or more projects ──────────────
// Body: { email: string, projectIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const { email, projectIds } = await req.json()
    if (!email || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'email and at least one projectId are required' }, { status: 400 })
    }

    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { adminClient } = ctx

    // Find or invite the user
    let userId: string
    const { data: userList } = await adminClient.auth.admin.listUsers()
    const existing = userList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (existing) {
      userId = existing.id
    } else {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://focusly-app-ten.vercel.app'
      const confirmUrl = `${siteUrl}/auth/confirm?next=${encodeURIComponent('/app/dashboard')}`
      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        { redirectTo: confirmUrl }
      )
      if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 400 })
      userId = invited.user.id
    }

    // Ensure profile row exists with type = 'user'
    await adminClient
      .from('profiles')
      .upsert({ id: userId, type: 'user' }, { onConflict: 'id', ignoreDuplicates: true })

    // Bulk upsert into project_members for all selected projects
    const rows = projectIds.map((pid: string) => ({
      project_id: pid,
      user_id: userId,
      role: 'viewer',
    }))
    const { error: memberError } = await adminClient
      .from('project_members')
      .upsert(rows, { onConflict: 'project_id,user_id' })
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

    return NextResponse.json({ success: true, userId, projectCount: projectIds.length })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE — remove a viewer from a specific project or all projects ─────────
// Body: { userId: string, projectId?: string }  (omit projectId to remove all)
export async function DELETE(req: NextRequest) {
  try {
    const { projectId, userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { adminClient } = ctx

    let query = adminClient.from('project_members').delete().eq('user_id', userId)
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
