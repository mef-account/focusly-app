'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, X, Loader2, Shield, User, Check, ChevronDown, ChevronRight, Building2, FolderKanban } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useProjects } from '@/lib/queries/useProjects'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { usePortfolios } from '@/lib/queries/usePortfolios'
import { useCurrentUserRole } from '@/lib/hooks/useCurrentUserRole'
import {
  useAllMembers,
  useInviteToProjects,
  useRemoveFromProject,
  type ProjectMember,
} from '@/lib/queries/useTeam'
import type { Project } from '@/types'

type Tab = 'account' | 'team'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account')

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
      <InvitePanel />
      <MemberList />
    </div>
  )
}

// ─── Invite Panel ─────────────────────────────────────────────────────────────

function InvitePanel() {
  const { data: allProjects = [] } = useProjects()
  const { data: workspaces = [] } = useWorkspaces()
  const { data: portfolios = [] } = usePortfolios()
  const invite = useInviteToProjects()

  const [email, setEmail] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Auto-expand all workspaces
  useEffect(() => {
    if (workspaces.length > 0) {
      setExpandedWs(new Set(workspaces.map((w) => w.id)))
    }
  }, [workspaces.length])

  function toggleProject(id: string) {
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
      for (const id of ids) {
        allChecked ? next.delete(id) : next.add(id)
      }
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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (selected.size === 0) { setError('Select at least one project.'); return }
    setError(null)
    setSuccess(false)
    try {
      await invite.mutateAsync({ email: email.trim(), projectIds: Array.from(selected) })
      setEmail('')
      setSelected(new Set())
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite')
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <UserPlus className="h-4 w-4" /> Invite a viewer
      </h3>

      <form onSubmit={handleInvite} className="space-y-4">
        {/* Email */}
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Project checklist */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {workspaces.map((ws) => {
            const wsProjects = allProjects.filter((p) => p.workspace_id === ws.id)
            if (wsProjects.length === 0) return null
            const wsPortfolios = portfolios
              .filter((p) => p.workspace_id === ws.id)
              .sort((a, b) => a.name.localeCompare(b.name))
            const unassigned = wsProjects.filter((p) => !p.portfolio_id)
            const wsOpen = expandedWs.has(ws.id)
            const wsState = groupState(wsProjects.map((p) => p.id))

            return (
              <div key={ws.id} className="rounded-lg border border-border">
                {/* Workspace header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-t-lg">
                  <CheckBox
                    state={wsState}
                    onClick={() => toggleGroup(wsProjects.map((p) => p.id))}
                  />
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                              <ProjectCheckRow key={p.id} project={p} checked={selected.has(p.id)} onToggle={() => toggleProject(p.id)} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    {unassigned.map((p) => (
                      <ProjectCheckRow key={p.id} project={p} checked={selected.has(p.id)} onToggle={() => toggleProject(p.id)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {selected.size === 0
              ? 'Select the projects this person can view.'
              : `${selected.size} project${selected.size !== 1 ? 's' : ''} selected`}
          </p>
          <Button type="submit" size="sm" disabled={invite.isPending || !email.trim() || selected.size === 0}>
            {invite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send invite'}
          </Button>
        </div>
      </form>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-500">Invite sent! They will receive a magic-link email.</p>}
    </div>
  )
}

// ─── Member List ──────────────────────────────────────────────────────────────

function MemberList() {
  const { data: allMembers = [], isLoading } = useAllMembers()
  const { data: allProjects = [] } = useProjects()
  const removeMutation = useRemoveFromProject()

  // Group flat rows by user
  const viewers = Object.values(
    allMembers.reduce<Record<string, { user_id: string; email: string | null; profiles: ProjectMember['profiles']; project_ids: string[] }>>(
      (acc, m) => {
        if (!acc[m.user_id]) {
          acc[m.user_id] = { user_id: m.user_id, email: m.email, profiles: m.profiles, project_ids: [] }
        }
        acc[m.user_id].project_ids.push(m.project_id)
        return acc
      },
      {}
    )
  )

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Members</h3>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : viewers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No viewers yet. Invite someone above.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {viewers.map((viewer) => (
            <ViewerRow
              key={viewer.user_id}
              viewer={viewer}
              allProjects={allProjects}
              onRemoveProject={(projectId) => removeMutation.mutate({ userId: viewer.user_id, projectId })}
              onRemoveAll={() => removeMutation.mutate({ userId: viewer.user_id })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Viewer Row ───────────────────────────────────────────────────────────────

function ViewerRow({
  viewer,
  allProjects,
  onRemoveProject,
  onRemoveAll,
}: {
  viewer: { user_id: string; email: string | null; profiles: ProjectMember['profiles']; project_ids: string[] }
  allProjects: Project[]
  onRemoveProject: (projectId: string) => void
  onRemoveAll: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const displayName = viewer.profiles?.name ?? viewer.email ?? viewer.user_id
  const initials = viewer.profiles?.name
    ? viewer.profiles.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (viewer.email ?? 'U').slice(0, 2).toUpperCase()

  const grantedProjects = allProjects.filter((p) => viewer.project_ids.includes(p.id))

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {viewer.email && viewer.profiles?.name && (
            <p className="truncate text-xs text-muted-foreground">{viewer.email}</p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">viewer</Badge>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {viewer.project_ids.length} project{viewer.project_ids.length !== 1 ? 's' : ''}
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <button
          onClick={onRemoveAll}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Remove from all projects"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-2 space-y-1">
          {grantedProjects.length === 0 ? (
            <p className="text-xs text-muted-foreground">No projects.</p>
          ) : (
            grantedProjects.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-0.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? '#534AB7' }} />
                <span className="flex-1 text-sm truncate">{p.name}</span>
                <button
                  onClick={() => onRemoveProject(p.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove access to this project"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function ProjectCheckRow({
  project,
  checked,
  onToggle,
}: {
  project: Project
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-3 py-1.5 pl-8 text-left hover:bg-accent/50 transition-colors"
    >
      <div
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
        }`}
      >
        {checked && <Check className="h-3 w-3" />}
      </div>
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: project.color ?? '#534AB7' }} />
      <span className="flex-1 truncate text-sm">{project.name}</span>
    </button>
  )
}
