'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, FolderKanban, Building2, X, ChevronDown, ChevronRight, Check, Loader2, Shield, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { useProjects } from '@/lib/queries/useProjects'
import { usePortfolios } from '@/lib/queries/usePortfolios'
import { useCurrentUserRole } from '@/lib/hooks/useCurrentUserRole'
import {
  useWorkspaceMembers,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberAccess,
  type WorkspaceMember,
} from '@/lib/queries/useTeam'
import type { Project } from '@/types'

type Tab = 'account' | 'team'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account')

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h2 className="text-xl font-semibold">Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">Manage your account and workspace.</p>

      {/* Tabs */}
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
  const isAdmin = role === 'admin'

  const { data: members = [], isLoading } = useWorkspaceMembers()
  const invite = useInviteMember()
  const removeMember = useRemoveMember()

  const [email, setEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const [managingMember, setManagingMember] = useState<WorkspaceMember | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(false)
    try {
      await invite.mutateAsync(email.trim())
      setEmail('')
      setInviteSuccess(true)
      setTimeout(() => setInviteSuccess(false), 4000)
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite')
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
        <Shield className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Only workspace admins can manage team members.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Invite a viewer
        </h3>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" size="sm" disabled={invite.isPending || !email.trim()}>
            {invite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send invite'}
          </Button>
        </form>
        {inviteError && <p className="mt-2 text-xs text-destructive">{inviteError}</p>}
        {inviteSuccess && (
          <p className="mt-2 text-xs text-green-500">Invite sent! They will receive a magic-link email.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Invited users receive a magic-link email and are added as <strong>viewers</strong>. After they accept, use <em>Manage Access</em> to grant them access to specific projects.
        </p>
      </div>

      {/* Members list */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Members</h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invited members yet.</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onManage={() => setManagingMember(member)}
                onRemove={() => removeMember.mutate(member.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Manage Access Dialog */}
      {managingMember && (
        <ManageAccessDialog
          member={managingMember}
          onClose={() => setManagingMember(null)}
        />
      )}
    </div>
  )
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  onManage,
  onRemove,
}: {
  member: WorkspaceMember
  onManage: () => void
  onRemove: () => void
}) {
  const initials = member.profiles?.name
    ? member.profiles.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : member.email.slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.profiles?.name ?? member.email}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs capitalize">
        {member.role}
      </Badge>
      <span className="text-xs text-muted-foreground shrink-0">
        {member.project_ids.length} project{member.project_ids.length !== 1 ? 's' : ''}
      </span>
      <button
        onClick={onManage}
        className="shrink-0 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        Manage access
      </button>
      <button
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        title="Remove member"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Manage Access Dialog ─────────────────────────────────────────────────────

function ManageAccessDialog({
  member,
  onClose,
}: {
  member: WorkspaceMember
  onClose: () => void
}) {
  const { data: allProjects = [] } = useProjects()
  const { data: portfolios = [] } = usePortfolios()
  const { data: workspaces = [] } = useWorkspaces()
  const updateAccess = useUpdateMemberAccess()

  const [selected, setSelected] = useState<Set<string>>(new Set(member.project_ids))
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set(workspaces.map((w) => w.id)))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const sortedWorkspaces = [...workspaces].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  )

  function toggleProject(projectId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  function toggleIds(projectIds: string[]) {
    const allChecked = projectIds.length > 0 && projectIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of projectIds) {
        if (allChecked) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  function checkedState(projectIds: string[]): 'all' | 'some' | 'none' {
    if (projectIds.length === 0) return 'none'
    const checked = projectIds.filter((id) => selected.has(id))
    if (checked.length === projectIds.length) return 'all'
    if (checked.length > 0) return 'some'
    return 'none'
  }

  function toggleWs(id: string) {
    setExpandedWs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await updateAccess.mutateAsync({ userId: member.user_id, projectIds: Array.from(selected) })
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save access')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Manage access</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Select projects <strong>{member.profiles?.name ?? member.email}</strong> can view.
          </p>
        </div>

        <div className="max-h-[55vh] overflow-y-auto space-y-3">
          {sortedWorkspaces.map((ws) => {
            const wsProjects = allProjects.filter((p) => p.workspace_id === ws.id)
            const wsPortfolios = portfolios
              .filter((p) => p.workspace_id === ws.id)
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
            const unassigned = wsProjects.filter((p) => !p.portfolio_id)
            const wsState = checkedState(wsProjects.map((p) => p.id))
            const wsOpen = expandedWs.has(ws.id)

            if (wsProjects.length === 0) return null

            return (
              <div key={ws.id} className="rounded-lg border border-border">
                {/* Workspace header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-t-lg">
                  <button
                    onClick={() => toggleIds(wsProjects.map((p) => p.id))}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      wsState === 'all'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : wsState === 'some'
                        ? 'border-primary bg-primary/30'
                        : 'border-input bg-background'
                    }`}
                  >
                    {wsState !== 'none' && <Check className="h-3 w-3" />}
                  </button>
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 text-sm font-semibold cursor-pointer" onClick={() => toggleWs(ws.id)}>
                    {ws.name}
                  </span>
                  <button onClick={() => toggleWs(ws.id)} className="text-muted-foreground">
                    {wsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {wsOpen && (
                  <div className="p-2 space-y-2">
                    {wsPortfolios.map((portfolio) => {
                      const portfolioProjects = wsProjects.filter((p) => p.portfolio_id === portfolio.id)
                      if (portfolioProjects.length === 0) return null
                      const state = checkedState(portfolioProjects.map((p) => p.id))

                      return (
                        <div key={portfolio.id} className="rounded-md border border-border">
                          <div className="flex items-center gap-2 px-3 py-2">
                            <button
                              onClick={() => toggleIds(portfolioProjects.map((p) => p.id))}
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
                            <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="flex-1 text-sm font-medium">{portfolio.name}</span>
                            <span className="text-xs text-muted-foreground">{portfolioProjects.length}</span>
                          </div>
                          <div className="border-t border-border divide-y divide-border">
                            {portfolioProjects.map((project) => (
                              <ProjectRow
                                key={project.id}
                                project={project}
                                checked={selected.has(project.id)}
                                onToggle={() => toggleProject(project.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {unassigned.length > 0 && (
                      <div className="rounded-md border border-border">
                        <div className="px-3 py-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            No portfolio
                          </span>
                        </div>
                        <div className="border-t border-border divide-y divide-border">
                          {unassigned.map((project) => (
                            <ProjectRow
                              key={project.id}
                              project={project}
                              checked={selected.has(project.id)}
                              onToggle={() => toggleProject(project.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {allProjects.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No projects yet.</p>
          )}
        </div>

        {saveError && (
          <p className="mt-3 text-xs text-destructive">{saveError}</p>
        )}
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save access'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProjectRow({
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
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-3 py-2 pl-10 text-left hover:bg-accent/50 transition-colors"
    >
      <div
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
        }`}
      >
        {checked && <Check className="h-3 w-3" />}
      </div>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: project.color ?? '#534AB7' }}
      />
      <span className="flex-1 truncate text-sm">{project.name}</span>
    </button>
  )
}
