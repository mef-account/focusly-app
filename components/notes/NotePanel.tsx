'use client'

import { Maximize2, Minimize2, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { NoteEditor } from '@/components/notes/NoteEditor'
import { useNotePanelStore } from '@/store/useNotePanelStore'
import { cn } from '@/lib/utils'

export function NotePanel() {
  const { activeNoteId, fullscreen, mode, close, setFullscreen } = useNotePanelStore()

  return (
    <Sheet open={!!activeNoteId} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        style={{
          width: fullscreen ? '100vw' : '100%',
          maxWidth: fullscreen ? '100vw' : '42rem',
        }}
        className={cn('flex flex-col gap-0 p-0 transition-[width,max-width] duration-200')}
      >
        <SheetTitle className="sr-only">Note preview</SheetTitle>

        {activeNoteId && (
          <NoteEditor
            key={activeNoteId}
            noteId={activeNoteId}
            defaultMode={fullscreen ? 'split' : mode}
            onDeleted={close}
            actions={
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  title={fullscreen ? 'Exit full screen' : 'Full screen'}
                  onClick={() => setFullscreen(!fullscreen)}
                >
                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  title="Close"
                  onClick={close}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            }
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
