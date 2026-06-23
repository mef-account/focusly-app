'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePortfolio } from '@/lib/queries/usePortfolios'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import { DescriptionRichTextEditor } from '@/components/richtext/DescriptionRichTextEditor'
import { normalizeDescriptionForSave } from '@/lib/richtext'

const COLORS = [
  '#534AB7', '#7C3AED', '#2563EB', '#0891B2',
  '#059669', '#D97706', '#DC2626', '#DB2777',
  '#64748B', '#1D4ED8', '#7E22CE', '#BE123C',
]

interface CreatePortfolioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePortfolioDialog({ open, onOpenChange }: CreatePortfolioDialogProps) {
  const { data: workspaces = [] } = useWorkspaces()
  const createPortfolio = useCreatePortfolio()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  // Default to first workspace once loaded
  const effectiveWorkspaceId = selectedWorkspaceId ?? workspaces[0]?.id ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveWorkspaceId || !name.trim()) return

    await createPortfolio.mutateAsync({
      name: name.trim(),
      description: normalizeDescriptionForSave(description),
      color,
      workspace_id: effectiveWorkspaceId,
    })

    setName('')
    setDescription('')
    setColor(COLORS[0])
    setSelectedWorkspaceId('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New portfolio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="portfolio-name">Name</Label>
            <Input
              id="portfolio-name"
              placeholder="Portfolio name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Workspace</Label>
            <Select
              value={effectiveWorkspaceId}
              onValueChange={setSelectedWorkspaceId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a workspace">
                  {workspaces.find((ws) => ws.id === effectiveWorkspaceId)?.name ?? 'Select a workspace'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label>Description</Label>
            <DescriptionRichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Optional description"
              minHeightClassName="min-h-[96px]"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !effectiveWorkspaceId || createPortfolio.isPending}>
              {createPortfolio.isPending ? 'Creating…' : 'Create portfolio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
