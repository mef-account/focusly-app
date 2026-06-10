'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Bold, Italic, Strikethrough, Code, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Code2,
  Minus, Link2, Eye, Edit3, Columns2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Marked config ────────────────────────────────────────────────────────────

marked.setOptions({ gfm: true, breaks: true })

function renderMarkdown(md: string): string {
  const raw = marked.parse(md) as string
  if (typeof window === 'undefined') return raw
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] })
}

// ─── Toolbar actions ──────────────────────────────────────────────────────────

type Action = {
  icon: React.ElementType
  label: string
  prefix: string
  suffix?: string
  block?: boolean
  shortcut?: string
}

const ACTIONS: (Action | 'sep')[] = [
  { icon: Bold, label: 'Bold', prefix: '**', suffix: '**', shortcut: 'Ctrl+B' },
  { icon: Italic, label: 'Italic', prefix: '_', suffix: '_', shortcut: 'Ctrl+I' },
  { icon: Strikethrough, label: 'Strikethrough', prefix: '~~', suffix: '~~' },
  { icon: Code, label: 'Inline code', prefix: '`', suffix: '`' },
  'sep',
  { icon: Heading2, label: 'Heading 2', prefix: '## ', block: true },
  { icon: Heading3, label: 'Heading 3', prefix: '### ', block: true },
  'sep',
  { icon: List, label: 'Bullet list', prefix: '- ', block: true },
  { icon: ListOrdered, label: 'Numbered list', prefix: '1. ', block: true },
  { icon: CheckSquare, label: 'Checklist', prefix: '- [ ] ', block: true },
  { icon: Quote, label: 'Blockquote', prefix: '> ', block: true },
  'sep',
  { icon: Code2, label: 'Code block', prefix: '```\n', suffix: '\n```', block: true },
  { icon: Minus, label: 'Divider', prefix: '\n---\n', block: true },
  { icon: Link2, label: 'Link', prefix: '[', suffix: '](url)' },
]

function applyAction(
  textarea: HTMLTextAreaElement,
  action: Action,
  onChange: (val: string) => void
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const selected = value.slice(start, end)

  let newText: string
  let newStart: number
  let newEnd: number

  if (action.block) {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const before = value.slice(0, lineStart)
    const after = value.slice(end)
    newText = before + action.prefix + (selected || 'text') + (action.suffix ?? '') + after
    newStart = lineStart + action.prefix.length
    newEnd = newStart + (selected || 'text').length
  } else {
    const before = value.slice(0, start)
    const after = value.slice(end)
    newText = before + action.prefix + (selected || 'text') + (action.suffix ?? '') + after
    newStart = start + action.prefix.length
    newEnd = newStart + (selected || 'text').length
  }

  onChange(newText)
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(newStart, newEnd)
  })
}

// ─── Main component ───────────────────────────────────────────────────────────

type ViewMode = 'edit' | 'split' | 'preview'

interface MarkdownEditorProps {
  value: string
  onChange: (val: string) => void
  className?: string
  defaultMode?: ViewMode
}

export function MarkdownEditor({ value, onChange, className, defaultMode = 'split' }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState<ViewMode>(defaultMode)
  const [html, setHtml] = useState('')

  // Re-render preview whenever value changes
  useEffect(() => {
    setHtml(renderMarkdown(value))
  }, [value])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!textareaRef.current) return

      if (ctrl && e.key === 'b') {
        e.preventDefault()
        applyAction(textareaRef.current, ACTIONS[0] as Action, onChange)
      }
      if (ctrl && e.key === 'i') {
        e.preventDefault()
        applyAction(textareaRef.current, ACTIONS[1] as Action, onChange)
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const { selectionStart, selectionEnd, value: v } = textareaRef.current
        const newVal = v.slice(0, selectionStart) + '  ' + v.slice(selectionEnd)
        onChange(newVal)
        requestAnimationFrame(() => {
          textareaRef.current!.setSelectionRange(selectionStart + 2, selectionStart + 2)
        })
      }
    },
    [onChange]
  )

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b px-3 py-1.5 flex-wrap">
        {ACTIONS.map((action, i) => {
          if (action === 'sep') return <Separator key={i} orientation="vertical" className="mx-0.5 h-5" />
          const Icon = action.icon
          return (
            <Tooltip key={action.label}>
              <TooltipTrigger render={<button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                onClick={() => {
                  if (textareaRef.current) applyAction(textareaRef.current, action, onChange)
                }}
              />}>
                <Icon className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>
                {action.label}{action.shortcut ? ` (${action.shortcut})` : ''}
              </TooltipContent>
            </Tooltip>
          )
        })}

        <div className="ml-auto flex items-center rounded-lg border p-0.5 gap-0.5">
          {(['edit', 'split', 'preview'] as ViewMode[]).map((m) => {
            const icons = { edit: Edit3, split: Columns2, preview: Eye }
            const Icon = icons[m]
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors capitalize',
                  mode === m
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3" /> {m}
              </button>
            )
          })}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Edit pane */}
        {(mode === 'edit' || mode === 'split') && (
          <textarea
            ref={textareaRef}
            spellCheck
            className={cn(
              'flex-1 resize-none bg-background p-4 font-mono text-sm outline-none placeholder:text-muted-foreground',
              mode === 'split' && 'border-r'
            )}
            placeholder="Start writing in Markdown…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}

        {/* Preview pane */}
        {(mode === 'preview' || mode === 'split') && (
          <div
            className="prose prose-sm dark:prose-invert max-w-none flex-1 overflow-y-auto p-4"
            dangerouslySetInnerHTML={{ __html: html || '<p class="text-muted-foreground">Nothing to preview yet…</p>' }}
          />
        )}
      </div>
    </div>
  )
}
