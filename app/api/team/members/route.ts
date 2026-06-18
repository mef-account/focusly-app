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

// ─── GET — list project_members for a project ──────────────────────────────
// Query param: ?projectId=<uuid>
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { adminClient } = ctx

    const projectId = req.nextUrl.searchParams.get('projectId')

    let query = adminClient
      .from('project_members')
      .select('project_id, user_id, role, created_at, profiles!project_members_user_id_fkey(id, name, avatar_url, email:id)')
      .order('created_at', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with auth email (profiles table doesn't store email)
    const userIds = (data ?? []).map((m: any) => m.user_id)
    let emailMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: users } = await adminClient.auth.admin.listUsers()
      for (const u of users?.users ?? []) {
        if (u.email) emailMap[u.id] = u.email
      }
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

// ─── POST — invite user and/or add to project ──────────────────────────────
// Body: { email: string, projectId: string }
export async function POST(req: NextRequest) {
  try {
    const { email, projectId } = await req.json()
    if (!email || !projectId) {
      return NextResponse.json({ error: 'email and projectId are required' }, { status: 400 })
    }

    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { adminClient } = ctx

    // Verify the project exists
    const { data: project } = await adminClient
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

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

    // Ensure a profiles row exists (auto-created by Supabase trigger, but ensure type = 'viewer')
    await adminClient
      .from('profiles')
      .upsert({ id: userId, type: 'viewer' }, { onConflict: 'id', ignoreDuplicates: true })

    // Add to project_members
    const { error: memberError } = await adminClient
      .from('project_members')
      .upsert({ project_id: projectId, user_id: userId, role: 'viewer' }, { onConflict: 'project_id,user_id' })
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

    return NextResponse.json({ success: true, userId })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE — remove a viewer from a project ──────────────────────────────
// Body: { projectId: string, userId: string }
export async function DELETE(req: NextRequest) {
  try {
    const { projectId, userId } = await req.json()
    if (!projectId || !userId) {
      return NextResponse.json({ error: 'projectId and userId are required' }, { status: 400 })
    }

    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { adminClient } = ctx

    const { error } = await adminClient
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
