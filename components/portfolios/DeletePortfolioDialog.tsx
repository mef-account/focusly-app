'use client'

import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeletePortfolio } from '@/lib/queries/usePortfolios'
import { createClient } from '@/lib/supabase/client'
import type { Portfolio } from '@/types'

const supabase = createClient()

interface DeletePortfolioDialogProps {
  portfolio: Portfolio
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeletePortfolioDialog({ portfolio, open, onOpenChange }: DeletePortfolioDialogProps) {
  const deletePortfolio = useDeletePortfolio()
  const [projectCount, setProjectCount] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('portfolio_id', portfolio.id)
      .then(({ count }) => setProjectCount(count ?? 0))
  }, [open, portfolio.id])

  async function handleDelete() {
    await deletePortfolio.mutateAsync(portfolio.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete portfolio</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-sm">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <p className="font-medium text-foreground">Projects will not be deleted</p>
                {projectCount !== null && projectCount > 0 ? (
                  <p className="mt-0.5 text-muted-foreground">
                    <span className="font-semibold">{projectCount}</span> project{projectCount !== 1 ? 's' : ''} linked to this portfolio will be unlinked but kept intact.
                  </p>
                ) : (
                  <p className="mt-0.5 text-muted-foreground">No projects are currently linked to this portfolio.</p>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">{portfolio.name}</span>?
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={deletePortfolio.isPending}
            onClick={handleDelete}
          >
            {deletePortfolio.isPending ? 'Deleting…' : 'Delete portfolio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
