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

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

function getSafeUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl, window.location.origin)
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function normalizeAnchorAttributes(html: string): string {
  if (!html || typeof window === 'undefined') return html
  const container = document.createElement('div')
  container.innerHTML = html
  const links = container.querySelectorAll('a[href]')
  links.forEach((link) => {
    const href = link.getAttribute('href')?.trim() ?? ''
    const safeHref = getSafeUrl(href)
    if (!safeHref) {
      link.removeAttribute('href')
      link.removeAttribute('target')
      link.removeAttribute('rel')
      return
    }
    link.setAttribute('href', safeHref)
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
  })
  return container.innerHTML
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
    const normalizedHtml = normalizeAnchorAttributes(editor.innerHTML)
    if (editor.innerHTML !== normalizedHtml) {
      editor.innerHTML = normalizedHtml
    }
    setIsEmpty(stripHtmlToText(normalizedHtml).trim().length === 0)
    onChange(normalizedHtml)
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
    const safeUrl = getSafeUrl(url)
    if (!safeUrl) return
    runCommand('createLink', safeUrl)
  }

  if (readOnly) {
    return (
      <div className={className}>
        {readOnlyHtml ? (
          <div
            className={cn(
              'prose prose-sm dark:prose-invert max-w-none text-foreground/90 [&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline',
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
            'prose prose-sm dark:prose-invert max-w-none w-full px-3 py-2.5 text-sm outline-none [&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline',
            minHeightClassName
          )}
          onInput={syncFromEditor}
          onClick={(e) => {
            const target = e.target as HTMLElement | null
            const anchor = target?.closest('a') as HTMLAnchorElement | null
            if (!anchor) return
            const href = anchor.getAttribute('href')?.trim() ?? ''
            const safeUrl = getSafeUrl(href)
            if (!safeUrl) return
            e.preventDefault()
            e.stopPropagation()
            window.open(safeUrl, '_blank', 'noopener,noreferrer')
          }}
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
