'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus, FolderKanban, Building2, LayoutGrid,
  MoreHorizontal, Pencil, Trash2, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditProjectDialog } from '@/components/projects/EditProjectDialog'
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog'
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
import type { Project, Portfolio, Workspace } from '@/types'

// ─── Project row ──────────────────────────────────────────────────────────────

function ProjectRow({ project }: { project: Project }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const done = project.done_count ?? 0
  const total = project.task_count ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
        <Link
          href={`/app/projects/${project.id}`}
          className="flex-1 min-w-0 text-sm font-medium truncate hover:text-primary transition-colors"
        >
          {project.name}
        </Link>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{done}/{total}</span>
        <div className="w-16 shrink-0">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: project.color }}
            />
          </div>
        </div>
        <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{pct}%</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all" />
            }
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
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
      <EditProjectDialog project={project} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteProjectDialog project={project} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}

// ─── Portfolio section ────────────────────────────────────────────────────────

function PortfolioSection({
  portfolio,
  projects,
  onNewProject,
}: {
  portfolio: Portfolio
  projects: Project[]
  onNewProject: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <div className="space-y-0.5">
        {/* Portfolio header */}
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 group hover:bg-accent/30 transition-colors">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <ChevronRight
              className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', !collapsed && 'rotate-90')}
            />
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: portfolio.color }} />
            <span className="font-semibold text-sm truncate">{portfolio.name}</span>
            <span className="text-xs text-muted-foreground">({projects.length})</span>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onNewProject}
            >
              <Plus className="h-3 w-3 mr-1" /> Project
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all" />
                }
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit portfolio
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete portfolio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Project rows */}
        {!collapsed && (
          <div className="ml-5 space-y-0.5 border-l pl-3">
            {projects.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground px-3">No projects in this portfolio.</p>
            ) : (
              projects.map((p) => <ProjectRow key={p.id} project={p} />)
            )}
          </div>
        )}
      </div>

      <EditPortfolioDialog portfolio={portfolio} open={editOpen} onOpenChange={setEditOpen} />
      <DeletePortfolioDialog portfolio={portfolio} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}

// ─── Workspace tab ────────────────────────────────────────────────────────────

function WorkspaceTab({
  workspace,
  active,
  onSelect,
}: {
  workspace: Workspace
  active: boolean
  onSelect: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          onClick={onSelect}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            active
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
        >
          {workspace.name}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" />
            }
          >
            <MoreHorizontal className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditWorkspaceDialog workspace={workspace} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteWorkspaceDialog workspace={workspace} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { data: projects = [], isLoading: loadingProjects } = useProjects()
  const { data: workspaces = [], isLoading: loadingWorkspaces } = useWorkspaces()
  const { data: portfolios = [], isLoading: loadingPortfolios } = usePortfolios()

  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false)
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  const isLoading = loadingProjects || loadingWorkspaces || loadingPortfolios

  // Filter to selected workspace
  const activePortfolios = selectedWorkspaceId
    ? portfolios.filter((p) => p.workspace_id === selectedWorkspaceId)
    : portfolios

  const activeProjects = selectedWorkspaceId
    ? projects.filter((p) => {
        if (p.portfolio_id) {
          const portfolio = portfolios.find((port) => port.id === p.portfolio_id)
          return portfolio?.workspace_id === selectedWorkspaceId
        }
        return p.workspace_id === selectedWorkspaceId
      })
    : projects

  // Group projects by portfolio
  const projectsByPortfolio = (portfolioId: string) =>
    activeProjects.filter((p) => p.portfolio_id === portfolioId)

  const unassignedProjects = activeProjects.filter((p) => !p.portfolio_id)

  return (
    <div className="mx-auto max-w-4xl space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h2 className="text-xl font-bold">Structure</h2>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWorkspaceDialogOpen(true)} className="gap-1.5 text-xs h-8">
            <Building2 className="h-3.5 w-3.5" /> Workspace
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPortfolioDialogOpen(true)} className="gap-1.5 text-xs h-8">
            <LayoutGrid className="h-3.5 w-3.5" /> Portfolio
          </Button>
          <Button size="sm" onClick={() => setProjectDialogOpen(true)} className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> Project
          </Button>
        </div>
      </div>

      {/* Workspace tabs */}
      <div className="flex items-center gap-1 border-b pb-2 flex-wrap">
        <button
          onClick={() => setSelectedWorkspaceId(null)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            selectedWorkspaceId === null
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
        >
          All
        </button>
        {loadingWorkspaces ? (
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-md" />)}
          </div>
        ) : (
          workspaces.map((ws) => (
            <WorkspaceTab
              key={ws.id}
              workspace={ws}
              active={selectedWorkspaceId === ws.id}
              onSelect={() => setSelectedWorkspaceId(ws.id)}
            />
          ))
        )}
      </div>

      {/* Content */}
      <div className="pt-4 space-y-2">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : activePortfolios.length === 0 && activeProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <FolderKanban className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">Create a project to get started</p>
            </div>
            <Button onClick={() => setProjectDialogOpen(true)} variant="outline" className="gap-2 mt-2">
              <Plus className="h-4 w-4" /> New project
            </Button>
          </div>
        ) : (
          <>
            {/* Portfolio sections */}
            {activePortfolios.map((portfolio) => (
              <PortfolioSection
                key={portfolio.id}
                portfolio={portfolio}
                projects={projectsByPortfolio(portfolio.id)}
                onNewProject={() => setProjectDialogOpen(true)}
              />
            ))}

            {/* Unassigned projects */}
            {unassignedProjects.length > 0 && (
              <UnassignedSection projects={unassignedProjects} />
            )}
          </>
        )}
      </div>

      <CreateProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
      <CreatePortfolioDialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen} />
      <CreateWorkspaceDialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen} />
    </div>
  )
}

// ─── Unassigned section ───────────────────────────────────────────────────────

function UnassignedSection({ projects }: { projects: Project[] }) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 w-full text-left hover:bg-accent/30 transition-colors"
      >
        <ChevronRight
          className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', !collapsed && 'rotate-90')}
        />
        <span className="text-sm font-medium text-muted-foreground">No portfolio</span>
        <span className="text-xs text-muted-foreground">({projects.length})</span>
      </button>
      {!collapsed && (
        <div className="ml-5 space-y-0.5 border-l pl-3">
          {projects.map((p) => <ProjectRow key={p.id} project={p} />)}
        </div>
      )}
    </div>
  )
}
