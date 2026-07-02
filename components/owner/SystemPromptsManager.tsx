'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { marked } from 'marked'
import { toast } from 'sonner'
import { PlusIcon, PencilIcon, EyeIcon, Trash2Icon, FileTextIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDistanceToNow } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import type { SystemPrompt } from '@/lib/types'
import { createSystemPrompt, updateSystemPrompt, deleteSystemPrompt } from '@/app/(owner)/owner/prompts/actions'

interface Props {
  prompts: SystemPrompt[]
  /** systemPromptId → number of bots using it. */
  usage: Record<string, number>
}

type Mode =
  | { kind: 'create' }
  | { kind: 'edit'; prompt: SystemPrompt }
  | { kind: 'view'; prompt: SystemPrompt }
  | null

// Height = 90% of the viewport; width = 80% of that height, so the editor/viewer
// is a comfortable portrait rectangle rather than a near-square.
const DIALOG_SIZE = 'flex h-[90vh] w-[72vh] max-w-[calc(100vw-2rem)] flex-col'

export function SystemPromptsManager({ prompts, usage }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {/* Create card — always first (matches the "Add source" pattern). */}
        <button
          type="button"
          onClick={() => setMode({ kind: 'create' })}
          className="group flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 p-4 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground/60 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <PlusIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium">Create prompt</span>
        </button>

        {prompts.map((p) => {
          const count = usage[p.id] ?? 0
          return (
            <div
              key={p.id}
              className="flex min-h-[160px] flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/15 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileTextIcon className="size-5" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    count > 0 ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
                  )}
                  title={`Used in ${count} bot${count === 1 ? '' : 's'}`}
                >
                  {count} bot{count === 1 ? '' : 's'}
                </span>
              </div>

              <div className="min-w-0">
                <p className="truncate font-medium text-foreground" title={p.name}>
                  {p.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Created {formatDistanceToNow(p.created_at)}
                </p>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode({ kind: 'view', prompt: p })}
                >
                  <EyeIcon className="size-3.5" /> View
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode({ kind: 'edit', prompt: p })}
                >
                  <PencilIcon className="size-3.5" /> Edit
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {(mode?.kind === 'create' || mode?.kind === 'edit') && (
        <PromptEditor
          key={mode.kind === 'edit' ? mode.prompt.id : 'new'}
          initial={mode.kind === 'edit' ? mode.prompt : null}
          usageCount={mode.kind === 'edit' ? (usage[mode.prompt.id] ?? 0) : 0}
          onClose={() => setMode(null)}
          onSaved={() => {
            setMode(null)
            router.refresh()
          }}
          onDeleted={() => {
            setMode(null)
            router.refresh()
          }}
        />
      )}

      {mode?.kind === 'view' && (
        <PromptViewer prompt={mode.prompt} onClose={() => setMode(null)} />
      )}
    </>
  )
}

// ── Create / Edit ────────────────────────────────────────────────────────────
function PromptEditor({
  initial,
  usageCount,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: SystemPrompt | null
  usageCount: number
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [saving, setSaving] = useState(false)

  const save = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Give the prompt a name.')
      return
    }
    setSaving(true)
    try {
      if (initial) await updateSystemPrompt(initial.id, name.trim(), content)
      else await createSystemPrompt(name.trim(), content)
      toast.success(initial ? 'Prompt updated' : 'Prompt created')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [initial, name, content, onSaved])

  const remove = useCallback(async () => {
    if (!initial) return
    const warn =
      usageCount > 0
        ? `Delete "${initial.name}"? ${usageCount} bot${usageCount === 1 ? '' : 's'} will keep the current text but lose the link.`
        : `Delete "${initial.name}"?`
    if (!window.confirm(warn)) return
    setSaving(true)
    try {
      await deleteSystemPrompt(initial.id)
      toast.success('Prompt deleted')
      onDeleted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
      setSaving(false)
    }
  }, [initial, usageCount, onDeleted])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DIALOG_SIZE}>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit prompt' : 'Create prompt'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="prompt-name">Name</Label>
          <Input
            id="prompt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. E-commerce, Default, SaaS support"
            autoFocus
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
          <Label htmlFor="prompt-content">Prompt (Markdown supported)</Label>
          <Textarea
            id="prompt-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Personality&#10;You are a friendly, helpful assistant for…"
            className="min-h-0 flex-1 resize-none font-mono text-sm leading-relaxed"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          {initial ? (
            <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={saving}>
              <Trash2Icon className="size-4 text-destructive" />
              <span className="text-destructive">Delete</span>
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save changes' : 'Create prompt'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── View (rendered Markdown) ───────────────────────────────────────────────────
function PromptViewer({ prompt, onClose }: { prompt: SystemPrompt; onClose: () => void }) {
  const html = useMemo(
    () => marked.parse(prompt.content || '_Empty prompt._', { async: false }) as string,
    [prompt.content],
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DIALOG_SIZE}>
        <DialogHeader>
          <DialogTitle>{prompt.name}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-5">
          <article className="article" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
