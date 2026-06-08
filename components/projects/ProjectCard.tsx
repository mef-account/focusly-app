'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/utils'
import { EditProjectDialog } from '@/components/projects/EditProjectDialog'
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const done = project.done_count ?? 0
  const total = project.task_count ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="group relative flex flex-col gap-3 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/app/projects/${project.id}`}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h3 className="truncate font-semibold group-hover:text-primary transition-colors">
              {project.name}
            </h3>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground tabular-nums">{done}/{total} tasks</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
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

        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        )}

        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: project.color }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{pct}% complete</span>
            <span>Updated {formatDate(project.updated_at)}</span>
          </div>
        </div>
      </div>

      <EditProjectDialog project={project} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteProjectDialog project={project} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}
