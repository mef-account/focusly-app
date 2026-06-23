'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { Bold, Italic, Underline, List, ListOrdered, Link2, Heading2, Heading3, Pilcrow } from 'lucide-react'
import { cn } from '@/lib/utils'
import { stripHtmlToText, toEditorHtml } from '@/lib/richtext'

interface DescriptionRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onCommit?: () => void
  readOnly?: boolean
  placeholder?: string
  className?: string
  minHeightClassName?: string
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function DescriptionRichTextEditor({
  value,
  onChange,
  onCommit,
  readOnly = false,
  placeholder = 'Add a description...',
  className,
  minHeightClassName = 'min-h-[84px]',
}: DescriptionRichTextEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  const readOnlyHtml = useMemo(() => {
    const html = toEditorHtml(value)
    return html
      ? DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] })
      : ''
  }, [value])

  useEffect(() => {
    if (readOnly) return
    const editor = editorRef.current
    if (!editor) return
    const expected = toEditorHtml(value)
    if (editor.innerHTML !== expected) {
      editor.innerHTML = expected
    }
    setIsEmpty(stripHtmlToText(editor.innerHTML).trim().length === 0)
  }, [value, readOnly])

  function syncFromEditor() {
    const editor = editorRef.current
    if (!editor) return
    setIsEmpty(stripHtmlToText(editor.innerHTML).trim().length === 0)
    onChange(editor.innerHTML)
  }

  function runCommand(command: string, commandValue?: string) {
    if (readOnly) return
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command, false, commandValue)
    syncFromEditor()
  }

  function setBlock(tag: 'P' | 'H2' | 'H3') {
    runCommand('formatBlock', tag)
  }

  function addLink() {
    if (readOnly) return
    const url = window.prompt('Enter link URL')
    if (!url) return
    runCommand('createLink', url)
  }

  if (readOnly) {
    return (
      <div className={className}>
        {readOnlyHtml ? (
          <div
            className={cn(
              'prose prose-sm dark:prose-invert max-w-none text-foreground/90 [&_a]:text-primary [&_a]:underline',
              minHeightClassName
            )}
            dangerouslySetInnerHTML={{ __html: readOnlyHtml }}
          />
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">{placeholder}</p>
        )}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={cn('rounded-md border bg-background', className)}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null
        if (next && rootRef.current?.contains(next)) return
        setIsFocused(false)
        onCommit?.()
      }}
      onFocusCapture={() => setIsFocused(true)}
    >
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
        <ToolbarButton title="Paragraph" onClick={() => setBlock('P')}>
          <Pilcrow className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Heading 2" onClick={() => setBlock('H2')}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Heading 3" onClick={() => setBlock('H3')}>
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Bold" onClick={() => runCommand('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => runCommand('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => runCommand('underline')}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" onClick={() => runCommand('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={() => runCommand('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Insert link" onClick={addLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <div className="relative">
        {isEmpty && !isFocused && (
          <div className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground/60">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'prose prose-sm dark:prose-invert max-w-none w-full px-3 py-2.5 text-sm outline-none [&_a]:text-primary [&_a]:underline',
            minHeightClassName
          )}
          onInput={syncFromEditor}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault()
              addLink()
            }
          }}
        />
      </div>
    </div>
  )
}
