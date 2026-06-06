'use client'

import { useState } from 'react'
import { Plus, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { useProjects } from '@/lib/queries/useProjects'

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Projects</h2>
          <p className="text-sm text-muted-foreground">
            {projects?.length ?? 0} project{projects?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : !projects?.length ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <FolderKanban className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground">Create your first project to get started</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2 mt-2">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
