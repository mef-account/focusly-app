'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, FolderKanban, X, Loader2, Shield, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/lib/queries/useProjects'
import { useCurrentUserRole } from '@/lib/hooks/useCurrentUserRole'
import {
  useProjectMembers,
  useInviteToProject,
  useRemoveFromProject,
  type ProjectMember,
} from '@/lib/queries/useTeam'

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
  const { data: projects = [] } = useProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // Auto-select first project when list loads
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

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

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="space-y-6">
      {/* Project selector */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
          <FolderKanban className="h-4 w-4" /> Project
        </h3>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet. Create a project first.</p>
        ) : (
          <Select value={selectedProjectId} onValueChange={(val) => setSelectedProjectId(val ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a project…" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color ?? '#534AB7' }}
                    />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Members for selected project */}
      {selectedProjectId && (
        <ProjectMembersPanel
          projectId={selectedProjectId}
          projectName={selectedProject?.name ?? ''}
        />
      )}
    </div>
  )
}

// ─── Project Members Panel ────────────────────────────────────────────────────

function ProjectMembersPanel({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const { data: members = [], isLoading } = useProjectMembers(projectId)
  const invite = useInviteToProject()
  const remove = useRemoveFromProject()

  const [email, setEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(false)
    try {
      await invite.mutateAsync({ email: email.trim(), projectId })
      setEmail('')
      setInviteSuccess(true)
      setTimeout(() => setInviteSuccess(false), 4000)
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite')
    }
  }

  return (
    <div className="space-y-4">
      {/* Invite form */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Invite viewer to <em>{projectName}</em>
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
          Invited users receive a magic-link email and are added as <strong>viewers</strong> for this project only.
        </p>
      </div>

      {/* Members list */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Members with access</h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No viewers yet for this project.</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {members.map((member) => (
              <MemberRow
                key={member.user_id}
                member={member}
                onRemove={() =>
                  remove.mutate({ projectId, userId: member.user_id })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  onRemove,
}: {
  member: ProjectMember
  onRemove: () => void
}) {
  const displayName = member.profiles?.name ?? member.email ?? member.user_id
  const initials = member.profiles?.name
    ? member.profiles.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (member.email ?? 'U').slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName}</p>
        {member.email && member.profiles?.name && (
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        )}
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs capitalize">
        {member.role}
      </Badge>
      <button
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        title="Remove from project"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
