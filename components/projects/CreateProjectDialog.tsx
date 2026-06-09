'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateProject } from '@/lib/queries/useProjects'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { usePortfolios } from '@/lib/queries/usePortfolios'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const COLORS = [
  '#534AB7', '#7C3AED', '#2563EB', '#0891B2',
  '#059669', '#D97706', '#DC2626', '#DB2777',
  '#64748B', '#1D4ED8', '#7E22CE', '#BE123C',
]

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultPortfolioId?: string | null
}

export function CreateProjectDialog({ open, onOpenChange, defaultPortfolioId }: CreateProjectDialogProps) {
  const { data: workspaces = [] } = useWorkspaces()
  const createProject = useCreateProject()
  const { data: portfolios = [] } = usePortfolios()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [portfolioId, setPortfolioId] = useState<string | null>('none')
  const [workspaceId, setWorkspaceId] = useState<string | null>('none')

  useEffect(() => {
    if (!open) return

    if (defaultPortfolioId) {
      const portfolio = portfolios.find((p) => p.id === defaultPortfolioId)
      setPortfolioId(defaultPortfolioId)
      setWorkspaceId(portfolio?.workspace_id ?? 'none')
    } else {
      setPortfolioId('none')
      setWorkspaceId('none')
    }
  }, [open, defaultPortfolioId, portfolios])

  // When workspaces load, default to the first one
  const effectiveWorkspaceId = workspaceId !== 'none' ? workspaceId : workspaces[0]?.id

  // Filter portfolios to selected workspace
  const visiblePortfolios = effectiveWorkspaceId
    ? portfolios.filter((p) => p.workspace_id === effectiveWorkspaceId)
    : portfolios

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveWorkspaceId || !name.trim()) return

    await createProject.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      color,
      workspace_id: effectiveWorkspaceId,
      portfolio_id: portfolioId === 'none' ? null : portfolioId,
    })

    setName('')
    setDescription('')
    setColor(COLORS[0])
    setPortfolioId('none')
    setWorkspaceId('none')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Name</Label>
            <Input
              id="proj-name"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {workspaces.length > 1 && (
            <div className="space-y-1.5">
              <Label>Workspace</Label>
              <Select
                value={workspaceId !== 'none' ? workspaceId : (workspaces[0]?.id ?? 'none')}
                onValueChange={(v) => { setWorkspaceId(v); setPortfolioId('none') }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {workspaces.find((w) => w.id === effectiveWorkspaceId)?.name ?? 'Select workspace'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {visiblePortfolios.length > 0 && (
            <div className="space-y-1.5">
              <Label>Portfolio</Label>
              <Select value={portfolioId} onValueChange={setPortfolioId}>
                <SelectTrigger>
                  <SelectValue>
                    {portfolioId === 'none'
                      ? 'No portfolio'
                      : visiblePortfolios.find((p) => p.id === portfolioId)?.name ?? 'No portfolio'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No portfolio</SelectItem>
                  {visiblePortfolios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full ring-offset-background transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid ${c}` : undefined,
                    outlineOffset: color === c ? '2px' : undefined,
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              placeholder="Optional description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createProject.isPending}>
              {createProject.isPending ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
