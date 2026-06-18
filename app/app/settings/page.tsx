'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, X, Loader2, Shield, User, Check, ChevronDown, ChevronRight, FolderKanban } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useProjects } from '@/lib/queries/useProjects'
import { usePortfolios } from '@/lib/queries/usePortfolios'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { useCurrentUserRole } from '@/lib/hooks/useCurrentUserRole'
import {
  useAllUsers,
  useInviteUser,
  useGrantProjects,
  useRemoveFromProject,
  type TeamUser,
} from '@/lib/queries/useTeam'
import type { Project } from '@/types'

type Tab = 'account' | 'team'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account')

  // Prefetch all Team tab data immediately so it's ready when the tab is clicked
  useAllUsers()
  useProjects()
  usePortfolios()
  useWorkspaces()

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h2 className="text-xl font-semibold">Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">Manage your account and workspace.</p>

      <div className="mt-6 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('account')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${tab === 'account' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <User className="h-3.5 w-3.5" /> Account
        </button>
        <button
          onClick={() => setTab('team')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${tab === 'team' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Users className="h-3.5 w-3.5" /> Team
        </button>
      </div>

      <div className="mt-6">
        {tab === 'account' && <AccountTab />}
        {tab === 'team' && <TeamTab />}
      </div>
    </div>
  )
}

// ─── Account Tab ──────────────────────────────────────────────────────────────

function AccountTab() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => {
        setUserEmail(data.user?.email ?? null)
        setUserId(data.user?.id ?? null)
      })
    })
  }, [])

  return (
    <div className="space-y-4 rounded-lg border border-border p-4 text-sm">
      <h3 className="font-semibold">Logged in as</h3>
      <div className="space-y-1 text-muted-foreground">
        <p>Email: <span className="text-foreground font-medium">{userEmail ?? '…'}</span></p>
        <p className="text-xs font-mono break-all">ID: {userId ?? '…'}</p>
      </div>
    </div>
  )
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab() {
  const role = useCurrentUserRole()

  if (role === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }

  if (role !== 'admin') {
    return (
      <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
        <Shield className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Only admins can manage team members.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Invite */}
      <InviteSection />
      {/* Section 2: Existing users + project access */}
      <UsersSection />
    </div>
  )
}

// ─── Section 1: Invite ────────────────────────────────────────────────────────

function InviteSection() {
  const inviteUser = useInviteUser()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    try {
      const result = await inviteUser.mutateAsync(email.trim())
      setEmail('')
      if (result.alreadyExists) {
        setSuccessMsg(`${email.trim()} already has an account and has been added to the users list.`)
      } else {
        setSuccessMsg(`Invite sent to ${email.trim()}. They will receive a magic-link email.`)
      }
      setTimeout(() => setSuccessMsg(null), 6000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
        <UserPlus className="h-4 w-4" /> Invite a new user
      </h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="sm" disabled={inviteUser.isPending || !email.trim()}>
          {inviteUser.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send invite'}
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {successMsg && <p className="mt-2 text-xs text-green-500">{successMsg}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        The person receives a magic-link email and becomes a <strong>viewer</strong> with no project access yet. Use the section below to assign projects.
      </p>
    </div>
  )
}

// ─── Section 2: Users & Project Access ────────────────────────────────────────

function UsersSection() {
  const { data: users = [], isLoading } = useAllUsers()
  const { data: allProjects = [] } = useProjects()
  const { data: portfolios = [] } = usePortfolios()
  const { data: workspaces = [] } = useWorkspaces()

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Users</h3>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users yet. Invite someone above.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {users.map((u) => (
            <UserRow
              key={u.user_id}
              user={u}
              allProjects={allProjects}
              portfolios={portfolios}
              workspaces={workspaces}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  allProjects,
  portfolios,
  workspaces,
}: {
  user: TeamUser
  allProjects: Project[]
  portfolios: { id: string; name: string; workspace_id: string }[]
  workspaces: { id: string; name: string }[]
}) {
  const [expanded, setExpanded] = useState(false)
  const displayName = user.profiles?.name ?? user.email ?? user.user_id
  const initials = user.profiles?.name
    ? user.profiles.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.email ?? 'U').slice(0, 2).toUpperCase()

  return (
    <div>
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {user.email && user.profiles?.name && (
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">viewer</Badge>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {user.project_ids.length} project{user.project_ids.length !== 1 ? 's' : ''}
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
      </div>

      {/* Expanded: unified project checklist */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <ProjectAccessTree
            userId={user.user_id}
            currentProjectIds={user.project_ids}
            allProjects={allProjects}
            portfolios={portfolios}
            workspaces={workspaces}
          />
        </div>
      )}
    </div>
  )
}

// ─── Project Access Tree ──────────────────────────────────────────────────────
// Unified checklist: checked = has access, unchecked = no access.
// Tracks local changes; saves diff on "Save" click.

function ProjectAccessTree({
  userId,
  currentProjectIds,
  allProjects,
  portfolios,
  workspaces,
}: {
  userId: string
  currentProjectIds: string[]
  allProjects: Project[]
  portfolios: { id: string; name: string; workspace_id: string }[]
  workspaces: { id: string; name: string }[]
}) {
  const grantProjects = useGrantProjects()
  const removeFromProject = useRemoveFromProject()

  // Local selection mirrors current access; user can toggle freely before saving
  const [selected, setSelected] = useState<Set<string>>(new Set(currentProjectIds))
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set(workspaces.map((w) => w.id)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep local state in sync when server data refreshes
  const currentKey = currentProjectIds.slice().sort().join(',')
  const [lastKey, setLastKey] = useState(currentKey)
  if (currentKey !== lastKey) {
    setSelected(new Set(currentProjectIds))
    setLastKey(currentKey)
  }

  const originalIds = new Set(currentProjectIds)
  const toAdd = Array.from(selected).filter((id) => !originalIds.has(id))
  const toRemove = Array.from(originalIds).filter((id) => !selected.has(id))
  const hasChanges = toAdd.length > 0 || toRemove.length > 0

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleGroup(ids: string[]) {
    const allChecked = ids.length > 0 && ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) allChecked ? next.delete(id) : next.add(id)
      return next
    })
  }

  function groupState(ids: string[]): 'all' | 'some' | 'none' {
    if (ids.length === 0) return 'none'
    const checked = ids.filter((id) => selected.has(id))
    if (checked.length === ids.length) return 'all'
    if (checked.length > 0) return 'some'
    return 'none'
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      if (toAdd.length > 0) {
        await grantProjects.mutateAsync({ userId, projectIds: toAdd })
      }
      for (const pid of toRemove) {
        await removeFromProject.mutateAsync({ userId, projectId: pid })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {workspaces.map((ws) => {
          const wsProjects = allProjects.filter((p) => p.workspace_id === ws.id)
          if (wsProjects.length === 0) return null
          const wsPortfolios = portfolios.filter((pf) => pf.workspace_id === ws.id)
          const unassigned = wsProjects.filter((p) => !p.portfolio_id)
          const wsOpen = expandedWs.has(ws.id)
          const wsState = groupState(wsProjects.map((p) => p.id))

          return (
            <div key={ws.id} className="rounded-lg border border-border">
              {/* Workspace header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-t-lg">
                <CheckBox state={wsState} onClick={() => toggleGroup(wsProjects.map((p) => p.id))} />
                <span
                  className="flex-1 text-sm font-semibold cursor-pointer"
                  onClick={() => setExpandedWs((prev) => {
                    const next = new Set(prev)
                    next.has(ws.id) ? next.delete(ws.id) : next.add(ws.id)
                    return next
                  })}
                >
                  {ws.name}
                </span>
                <span className="text-xs text-muted-foreground">{wsProjects.length}</span>
                <button
                  type="button"
                  onClick={() => setExpandedWs((prev) => {
                    const next = new Set(prev)
                    next.has(ws.id) ? next.delete(ws.id) : next.add(ws.id)
                    return next
                  })}
                  className="text-muted-foreground"
                >
                  {wsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>

              {wsOpen && (
                <div className="p-2 space-y-1">
                  {wsPortfolios.map((pf) => {
                    const pfProjects = wsProjects.filter((p) => p.portfolio_id === pf.id)
                    if (pfProjects.length === 0) return null
                    const pfState = groupState(pfProjects.map((p) => p.id))
                    return (
                      <div key={pf.id} className="rounded border border-border">
                        <div className="flex items-center gap-2 px-3 py-1.5">
                          <CheckBox state={pfState} onClick={() => toggleGroup(pfProjects.map((p) => p.id))} />
                          <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 text-sm font-medium">{pf.name}</span>
                        </div>
                        <div className="border-t border-border">
                          {pfProjects.map((p) => (
                            <ProjectToggle key={p.id} project={p} checked={selected.has(p.id)} onToggle={() => toggle(p.id)} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {unassigned.map((p) => (
                    <ProjectToggle key={p.id} project={p} checked={selected.has(p.id)} onToggle={() => toggle(p.id)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          {hasChanges
            ? `${toAdd.length > 0 ? `+${toAdd.length} add` : ''}${toAdd.length > 0 && toRemove.length > 0 ? ', ' : ''}${toRemove.length > 0 ? `−${toRemove.length} remove` : ''}`
            : 'Check or uncheck projects to change access.'}
        </p>
        <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  )
}

// ─── CheckBox ─────────────────────────────────────────────────────────────────

function CheckBox({ state, onClick }: { state: 'all' | 'some' | 'none'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        state === 'all'
          ? 'border-primary bg-primary text-primary-foreground'
          : state === 'some'
          ? 'border-primary bg-primary/30'
          : 'border-input bg-background'
      }`}
    >
      {state !== 'none' && <Check className="h-3 w-3" />}
    </button>
  )
}

// ─── Project Toggle ───────────────────────────────────────────────────────────

function ProjectToggle({ project, checked, onToggle }: { project: Project; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded px-2 py-1 pl-4 text-left hover:bg-accent/50 transition-colors"
    >
      <div
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
        }`}
      >
        {checked && <Check className="h-2.5 w-2.5" />}
      </div>
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: project.color ?? '#534AB7' }} />
      <span className="flex-1 truncate text-sm">{project.name}</span>
    </button>
  )
}
