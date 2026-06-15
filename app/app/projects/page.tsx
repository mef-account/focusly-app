'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus, FolderKanban, Building2, LayoutGrid,
  MoreHorizontal, Pencil, Trash2, ChevronRight,
} from 'lucide-react'
import { addDays, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns'
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
import { StructureGantt, GANTT_TOOLBAR_H } from '@/components/projects/StructureGantt'
import { useProjects } from '@/lib/queries/useProjects'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { usePortfolios } from '@/lib/queries/usePortfolios'
import { cn } from '@/lib/utils'
import type { Project, Portfolio, Workspace } from '@/types'

const ROW_H = 'h-7'

type Row =
  | { kind: 'portfolio'; portfolio: Portfolio; projectCount: number }
  | { kind: 'project'; project: Project }
  | { kind: 'empty'; message: string }
  | { kind: 'unassigned_header'; count: number }

// ─── Gantt helpers ────────────────────────────────────────────────────────────

function buildGanttWindow(projects: Project[]) {
  const dates = projects
    .flatMap((p) => [p.min_due_date, p.max_due_date])
    .filter(Boolean) as string[]

  if (dates.length === 0) {
    const now = new Date()
    return {
      start: startOfMonth(subDays(now, 90)),
      end: endOfMonth(addDays(now, 90)),
    }
  }

  const sorted = [...dates].sort()
  return {
    start: subDays(parseISO(sorted[0]), 90),
    end: addDays(parseISO(sorted[sorted.length - 1]), 90),
  }
}

// ─── Project row (left panel) ─────────────────────────────────────────────────

function ProjectNameRow({ project }: { project: Project }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className={cn(ROW_H, 'flex items-center gap-2 pl-10 pr-2 group hover:bg-accent/50 transition-colors')}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
        <Link
          href={`/app/projects/${project.id}`}
          className="flex-1 min-w-0 text-sm truncate hover:text-primary transition-colors"
        >
          {project.name}
        </Link>
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

// ─── Portfolio header (left) ──────────────────────────────────────────────────

function PortfolioNameRow({
  portfolio,
  projectCount,
  collapsed,
  onToggle,
  onNewProject,
}: {
  portfolio: Portfolio
  projectCount: number
  collapsed: boolean
  onToggle: () => void
  onNewProject: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className={cn(ROW_H, 'flex items-center gap-1 px-2 group hover:bg-accent/30 transition-colors')}>
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <ChevronRight
            className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', !collapsed && 'rotate-90')}
          />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: portfolio.color }} />
          <span className="font-semibold text-sm truncate">{portfolio.name}</span>
          <span className="text-xs text-muted-foreground">({projectCount})</span>
        </button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onNewProject}
        >
          <Plus className="h-3 w-3" />
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
      <div className="group/wstab flex items-center gap-0.5">
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
              <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/wstab:opacity-100 hover:bg-accent hover:text-foreground transition-all" />
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
  const [createForPortfolioId, setCreateForPortfolioId] = useState<string | null>(null)
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false)
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [collapsedPortfolios, setCollapsedPortfolios] = useState<Set<string>>(new Set())
  const [unassignedCollapsed, setUnassignedCollapsed] = useState(true)

  const isLoading = loadingProjects || loadingWorkspaces || loadingPortfolios

  const activePortfolios = (selectedWorkspaceId
    ? portfolios.filter((p) => p.workspace_id === selectedWorkspaceId)
    : portfolios
  ).slice().sort((a, b) => a.name.localeCompare(b.name))

  const activeProjects = selectedWorkspaceId
    ? projects.filter((p) => {
        if (p.portfolio_id) {
          const portfolio = portfolios.find((port) => port.id === p.portfolio_id)
          return portfolio?.workspace_id === selectedWorkspaceId
        }
        return p.workspace_id === selectedWorkspaceId
      })
    : projects

  const sortByName = (a: Project, b: Project) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })

  const projectsByPortfolio = (portfolioId: string) =>
    activeProjects.filter((p) => p.portfolio_id === portfolioId).sort(sortByName)

  const unassignedProjects = activeProjects.filter((p) => !p.portfolio_id).sort(sortByName)

  const { windowStart, windowEnd } = useMemo(() => {
    const { start, end } = buildGanttWindow(activeProjects)
    return { windowStart: start, windowEnd: end }
  }, [activeProjects])

  const rows: Row[] = useMemo(() => {
    const result: Row[] = []

    for (const portfolio of activePortfolios) {
      const portfolioProjects = projectsByPortfolio(portfolio.id)
      result.push({ kind: 'portfolio', portfolio, projectCount: portfolioProjects.length })

      if (!collapsedPortfolios.has(portfolio.id)) {
        if (portfolioProjects.length === 0) {
          result.push({ kind: 'empty', message: 'No projects in this portfolio.' })
        } else {
          for (const project of portfolioProjects) {
            result.push({ kind: 'project', project })
          }
        }
      }
    }

    if (unassignedProjects.length > 0) {
      result.push({ kind: 'unassigned_header', count: unassignedProjects.length })
      if (!unassignedCollapsed) {
        for (const project of unassignedProjects) {
          result.push({ kind: 'project', project })
        }
      }
    }

    return result
  }, [activePortfolios, activeProjects, collapsedPortfolios, unassignedCollapsed, unassignedProjects])

  function togglePortfolio(id: string) {
    setCollapsedPortfolios((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openProjectDialog(portfolioId?: string) {
    setCreateForPortfolioId(portfolioId ?? null)
    setProjectDialogOpen(true)
  }

  function handleProjectDialogChange(open: boolean) {
    setProjectDialogOpen(open)
    if (!open) setCreateForPortfolioId(null)
  }

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Header — project count | workspace tabs | action buttons */}
      <div className="flex items-center gap-4 border-b pb-3">
        <div className="shrink-0">
          <p className="text-sm text-muted-foreground">
            {activeProjects.length} project{activeProjects.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Workspace tabs */}
        <div className="flex flex-1 items-center gap-1 flex-wrap">
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
            [...workspaces].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map((ws) => (
              <WorkspaceTab
                key={ws.id}
                workspace={ws}
                active={selectedWorkspaceId === ws.id}
                onSelect={() => setSelectedWorkspaceId(ws.id)}
              />
            ))
          )}
        </div>

        {/* Action buttons — right */}
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWorkspaceDialogOpen(true)} className="gap-1.5 text-xs h-8">
            <Building2 className="h-3.5 w-3.5" /> Workspace
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPortfolioDialogOpen(true)} className="gap-1.5 text-xs h-8">
            <LayoutGrid className="h-3.5 w-3.5" /> Portfolio
          </Button>
          <Button size="sm" onClick={() => openProjectDialog()} className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> Project
          </Button>
        </div>
      </div>

      {/* Table + Gantt */}
      <div className="flex flex-1 min-h-0 pt-2">
        {isLoading ? (
          <div className="space-y-3 w-full">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
          </div>
        ) : activePortfolios.length === 0 && activeProjects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <FolderKanban className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">Create a project to get started</p>
            </div>
            <Button onClick={() => openProjectDialog()} variant="outline" className="gap-2 mt-2">
              <Plus className="h-4 w-4" /> New project
            </Button>
          </div>
        ) : (
          <>
            {/* Left: project names */}
            <div className="w-72 shrink-0 border-r flex flex-col">
              <div className={cn(GANTT_TOOLBAR_H, 'border-b shrink-0')} />
              <div className={cn(ROW_H, 'flex items-center border-b px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground shrink-0')}>
                Project
              </div>
              {rows.map((row, i) => {
                if (row.kind === 'portfolio') {
                  return (
                    <PortfolioNameRow
                      key={`p-${row.portfolio.id}`}
                      portfolio={row.portfolio}
                      projectCount={row.projectCount}
                      collapsed={collapsedPortfolios.has(row.portfolio.id)}
                      onToggle={() => togglePortfolio(row.portfolio.id)}
                      onNewProject={() => openProjectDialog(row.portfolio.id)}
                    />
                  )
                }
                if (row.kind === 'project') {
                  return <ProjectNameRow key={`proj-${row.project.id}`} project={row.project} />
                }
                if (row.kind === 'empty') {
                  return (
                    <div key={`empty-${i}`} className={cn(ROW_H, 'flex items-center pl-8 text-xs text-muted-foreground')}>
                      {row.message}
                    </div>
                  )
                }
                if (row.kind === 'unassigned_header') {
                  return (
                    <button
                      key="unassigned-header"
                      onClick={() => setUnassignedCollapsed((v) => !v)}
                      className={cn(ROW_H, 'flex w-full items-center gap-2 px-2 text-left hover:bg-accent/30 transition-colors')}
                    >
                      <ChevronRight
                        className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', !unassignedCollapsed && 'rotate-90')}
                      />
                      <span className="text-sm font-medium text-muted-foreground">No portfolio</span>
                      <span className="text-xs text-muted-foreground">({row.count})</span>
                    </button>
                  )
                }
                return null
              })}
            </div>

            {/* Right: Gantt timeline */}
            <StructureGantt rows={rows} windowStart={windowStart} windowEnd={windowEnd} />
          </>
        )}
      </div>

      <CreateProjectDialog
        open={projectDialogOpen}
        onOpenChange={handleProjectDialogChange}
        defaultPortfolioId={createForPortfolioId}
      />
      <CreatePortfolioDialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen} />
      <CreateWorkspaceDialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen} />
    </div>
  )
}
