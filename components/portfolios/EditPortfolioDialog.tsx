'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useUpdatePortfolio } from '@/lib/queries/usePortfolios'
import { useWorkspaces } from '@/lib/queries/useWorkspace'
import type { Portfolio } from '@/types'

const COLORS = [
  '#534AB7', '#7C3AED', '#2563EB', '#0891B2',
  '#059669', '#D97706', '#DC2626', '#DB2777',
  '#64748B', '#1D4ED8', '#7E22CE', '#BE123C',
]

interface EditPortfolioDialogProps {
  portfolio: Portfolio
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPortfolioDialog({ portfolio, open, onOpenChange }: EditPortfolioDialogProps) {
  const updatePortfolio = useUpdatePortfolio()
  const { data: workspaces = [] } = useWorkspaces()

  const [name, setName] = useState(portfolio.name)
  const [description, setDescription] = useState(portfolio.description ?? '')
  const [color, setColor] = useState(portfolio.color)
  const [workspaceId, setWorkspaceId] = useState<string | null>(portfolio.workspace_id)

  useEffect(() => {
    if (open) {
      setName(portfolio.name)
      setDescription(portfolio.description ?? '')
      setColor(portfolio.color)
      setWorkspaceId(portfolio.workspace_id)
    }
  }, [open, portfolio])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await updatePortfolio.mutateAsync({
      id: portfolio.id,
      name: name.trim(),
      description: description.trim() || null,
      color,
      workspace_id: workspaceId ?? undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit portfolio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-port-name">Name</Label>
            <Input
              id="edit-port-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Workspace</Label>
            <Select value={workspaceId} onValueChange={setWorkspaceId}>
              <SelectTrigger>
                <SelectValue>
                  {workspaces.find((ws) => ws.id === workspaceId)?.name ?? 'Select workspace'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
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
            <Label htmlFor="edit-port-desc">Description</Label>
            <Textarea
              id="edit-port-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || updatePortfolio.isPending}>
              {updatePortfolio.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
