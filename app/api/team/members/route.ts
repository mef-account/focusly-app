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

// ─── GET — all user-type profiles + their current project_ids ─────────────────
export async function GET() {
  try {
    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { adminClient } = ctx

    // All user-type profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('type', 'user')
    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })
    if (!profiles || profiles.length === 0) return NextResponse.json([])

    // Auth emails
    const { data: authUsers } = await adminClient.auth.admin.listUsers()
    const emailMap: Record<string, string> = {}
    for (const u of authUsers?.users ?? []) {
      if (u.email) emailMap[u.id] = u.email
    }

    // Current project access
    const userIds = profiles.map((p: any) => p.id)
    const { data: members } = await adminClient
      .from('project_members')
      .select('project_id, user_id')
      .in('user_id', userIds)
    const accessMap: Record<string, string[]> = {}
    for (const m of members ?? []) {
      if (!accessMap[m.user_id]) accessMap[m.user_id] = []
      accessMap[m.user_id].push(m.project_id)
    }

    const result = profiles.map((p: any) => ({
      user_id: p.id,
      email: emailMap[p.id] ?? null,
      profiles: { id: p.id, name: p.name, avatar_url: p.avatar_url },
      project_ids: accessMap[p.id] ?? [],
    }))

    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

// ─── POST — two shapes ─────────────────────────────────────────────────────────
// Shape A — invite by email:      { email: string }
// Shape B — grant project access: { userId: string, projectIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { adminClient } = ctx

    // ── Shape A: invite by email ──────────────────────────────────────────────
    if (body.email && !body.userId) {
      const { email } = body
      const { data: userList } = await adminClient.auth.admin.listUsers()
      const existing = userList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

      if (existing) {
        // User already exists — just make sure their profile type is 'user'
        await adminClient
          .from('profiles')
          .update({ type: 'user' })
          .eq('id', existing.id)
          .eq('type', 'user') // no-op if already user, prevents downgrading admin
        return NextResponse.json({ success: true, userId: existing.id, alreadyExists: true })
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://focusly-app-ten.vercel.app'
      const confirmUrl = `${siteUrl}/auth/confirm?next=${encodeURIComponent('/app/dashboard')}`
      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        { redirectTo: confirmUrl }
      )
      if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 400 })

      // Ensure profile row exists with type = 'user'
      await adminClient
        .from('profiles')
        .upsert({ id: invited.user.id, type: 'user' }, { onConflict: 'id', ignoreDuplicates: true })

      return NextResponse.json({ success: true, userId: invited.user.id, alreadyExists: false })
    }

    // ── Shape B: grant project access to existing user ────────────────────────
    if (body.userId && Array.isArray(body.projectIds)) {
      const { userId, projectIds } = body
      if (projectIds.length === 0) return NextResponse.json({ success: true })

      const rows = projectIds.map((pid: string) => ({
        project_id: pid,
        user_id: userId,
        role: 'viewer',
      }))
      const { error } = await adminClient
        .from('project_members')
        .upsert(rows, { onConflict: 'project_id,user_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE — remove a viewer from one project or all projects ────────────────
// Body: { userId: string, projectId?: string }
export async function DELETE(req: NextRequest) {
  try {
    const { projectId, userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { adminClient } = ctx

    let query = adminClient.from('project_members').delete().eq('user_id', userId)
    if (projectId) query = query.eq('project_id', projectId)
    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
