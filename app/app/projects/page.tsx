'use client'

import { useState } from 'react'
import { Plus, FolderKanban, Building2, LayoutGrid, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { CreatePortfolioDialog } from '@/components/portfolios/CreatePortfolioDialog'
import { EditPortfolioDialog } from '@/components/portfolios/EditPortfolioDialog'
import { DeletePortfolioDialog } from '@/components/portfolios/DeletePortfolioDialog'
import { CreateWorkspaceDialog } from '@/components/workspaces/CreateWorkspaceDialog'
import { EditWorkspaceDialog } from '@/components/workspaces/EditWorkspaceDialog'
import { DeleteWorkspaceDialog } from '@/components/workspaces/DeleteWorkspaceDialog'
import { useProjects } from '@/lib/queries/useProjects'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { usePortfolios } from '@/lib/queries/usePortfolios'
import { cn } from '@/lib/utils'
import type { Workspace, Portfolio } from '@/types'

// ─── Workspace Card ────────────────────────────────────────────────────────────

function WorkspaceCard({
  workspace,
  selected,
  onSelect,
}: {
  workspace: Workspace
  selected: boolean
  onSelect: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div
        className={cn(
          'flex flex-col gap-3 rounded-xl border bg-card p-5 cursor-pointer transition-all',
          selected
            ? 'ring-2 ring-primary border-primary bg-accent/20'
            : 'hover:border-primary/40 hover:bg-accent/10'
        )}
        onClick={onSelect}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
              selected ? 'bg-primary/20' : 'bg-primary/10'
            )}>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <h3 className="truncate font-semibold">{workspace.name}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Badge variant="secondary" className="capitalize text-xs">{workspace.type}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" />
                }
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Created {format(new Date(workspace.created_at), 'MM/dd/yyyy')}
        </p>
      </div>

      <EditWorkspaceDialog workspace={workspace} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteWorkspaceDialog workspace={workspace} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}

// ─── Portfolio Card ────────────────────────────────────────────────────────────

function PortfolioCard({
  portfolio,
  selected,
  onSelect,
}: {
  portfolio: Portfolio
  selected: boolean
  onSelect: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div
        className={cn(
          'flex flex-col gap-3 rounded-xl border bg-card p-5 cursor-pointer transition-all',
          selected
            ? 'ring-2 ring-primary border-primary bg-accent/20'
            : 'hover:border-primary/40 hover:bg-accent/10'
        )}
        onClick={onSelect}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: portfolio.color }} />
            <h3 className="truncate font-semibold">{portfolio.name}</h3>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" />
                }
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {portfolio.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{portfolio.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Created {format(new Date(portfolio.created_at), 'MM/dd/yyyy')}
        </p>
      </div>

      <EditPortfolioDialog portfolio={portfolio} open={editOpen} onOpenChange={setEditOpen} />
      <DeletePortfolioDialog portfolio={portfolio} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      <span>Filtered by: {label}</span>
      <button onClick={onClear} className="hover:text-primary/70 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { data: projects, isLoading: loadingProjects } = useProjects()
  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces()
  const { data: portfolios, isLoading: loadingPortfolios } = usePortfolios()

  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false)
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false)

  // ─── Filter state ──────────────────────────────────────────────────────────
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)

  function handleWorkspaceSelect(id: string) {
    setSelectedWorkspaceId((prev) => (prev === id ? null : id))
    setSelectedPortfolioId(null)
  }

  function handlePortfolioSelect(id: string) {
    setSelectedPortfolioId((prev) => (prev === id ? null : id))
  }

  // ─── Filtered lists ────────────────────────────────────────────────────────
  const visiblePortfolios = selectedWorkspaceId
    ? (portfolios ?? []).filter((p) => p.workspace_id === selectedWorkspaceId)
    : (portfolios ?? [])

  const visibleProjects = (() => {
    const list = projects ?? []
    const allPortfolios = portfolios ?? []

    if (selectedPortfolioId) return list.filter((p) => p.portfolio_id === selectedPortfolioId)

    if (selectedWorkspaceId) {
      return list.filter((p) => {
        if (p.portfolio_id) {
          // Project is in a portfolio — follow the portfolio's workspace
          const portfolio = allPortfolios.find((port) => port.id === p.portfolio_id)
          return portfolio?.workspace_id === selectedWorkspaceId
        }
        // No portfolio — use the project's own workspace_id
        return p.workspace_id === selectedWorkspaceId
      })
    }

    return list
  })()

  const selectedWorkspace = workspaces?.find((w) => w.id === selectedWorkspaceId)
  const selectedPortfolio = portfolios?.find((p) => p.id === selectedPortfolioId)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Structure</h2>
          <p className="text-sm text-muted-foreground">
            {projects?.length ?? 0} project{projects?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setWorkspaceDialogOpen(true)} className="gap-2">
            <Building2 className="h-4 w-4" />
            New workspace
          </Button>
          <Button variant="outline" onClick={() => setPortfolioDialogOpen(true)} className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            New portfolio
          </Button>
          <Button onClick={() => setProjectDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>
      </div>

      {/* Workspaces section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Workspaces</h3>
          {workspaces && <span className="text-xs text-muted-foreground">{workspaces.length}</span>}
          {selectedWorkspaceId && (
            <button
              onClick={() => { setSelectedWorkspaceId(null); setSelectedPortfolioId(null) }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>
        {loadingWorkspaces ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : !workspaces?.length ? (
          <p className="text-sm text-muted-foreground">No workspaces yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                selected={selectedWorkspaceId === ws.id}
                onSelect={() => handleWorkspaceSelect(ws.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Portfolios section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Portfolios</h3>
          <span className="text-xs text-muted-foreground">{visiblePortfolios.length}</span>
          {selectedWorkspace && (
            <FilterChip
              label={selectedWorkspace.name}
              onClear={() => { setSelectedWorkspaceId(null); setSelectedPortfolioId(null) }}
            />
          )}
        </div>
        {loadingPortfolios ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : !visiblePortfolios.length ? (
          <p className="text-sm text-muted-foreground">
            {selectedWorkspaceId ? 'No portfolios in this workspace.' : 'No portfolios yet.'}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePortfolios.map((p) => (
              <PortfolioCard
                key={p.id}
                portfolio={p}
                selected={selectedPortfolioId === p.id}
                onSelect={() => handlePortfolioSelect(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Projects section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Projects</h3>
          <span className="text-xs text-muted-foreground">{visibleProjects.length}</span>
          {selectedWorkspace && !selectedPortfolio && (
            <FilterChip
              label={selectedWorkspace.name}
              onClear={() => { setSelectedWorkspaceId(null); setSelectedPortfolioId(null) }}
            />
          )}
          {selectedPortfolio && (
            <FilterChip
              label={selectedPortfolio.name}
              onClear={() => setSelectedPortfolioId(null)}
            />
          )}
        </div>
        {loadingProjects ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : !visibleProjects.length ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <FolderKanban className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No projects found</p>
              <p className="text-sm text-muted-foreground">
                {selectedWorkspaceId || selectedPortfolioId
                  ? 'No projects match the current filter.'
                  : 'Create your first project to get started'}
              </p>
            </div>
            {!selectedWorkspaceId && !selectedPortfolioId && (
              <Button onClick={() => setProjectDialogOpen(true)} variant="outline" className="gap-2 mt-2">
                <Plus className="h-4 w-4" /> New project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
          </div>
        )}
      </div>

      <CreateProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
      <CreatePortfolioDialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen} />
      <CreateWorkspaceDialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen} />
    </div>
  )
}
