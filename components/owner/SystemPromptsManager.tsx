'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { marked } from 'marked'
import { toast } from 'sonner'
import {
  PlusIcon,
  PencilIcon,
  EyeIcon,
  Trash2Icon,
  FileTextIcon,
  HistoryIcon,
  UploadIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import '@/components/blog/article.css'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDistanceToNow } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { SYSTEM_PROMPT_MAX } from '@/lib/validation/schemas'
import type { SystemPrompt, SystemPromptVersion } from '@/lib/types'
import {
  createSystemPrompt,
  updateSystemPrompt,
  deleteSystemPrompt,
  publishSystemPrompt,
} from '@/app/(owner)/owner/prompts/actions'

export interface VersionUsage {
  botName: string
  orgName: string
}

interface Props {
  prompts: SystemPrompt[]
  /** All published versions, newest first. */
  versions: SystemPromptVersion[]
  /** systemPromptId → number of bots using the family. */
  usage: Record<string, number>
  /** versionId (or `unversioned:<promptId>`) → bots pinned to it. */
  versionUsage: Record<string, VersionUsage[]>
}

type Mode =
  | { kind: 'create' }
  | { kind: 'edit'; prompt: SystemPrompt }
  | { kind: 'view'; prompt: SystemPrompt }
  | { kind: 'history'; prompt: SystemPrompt }
  | null

// Height = 90% of the viewport; width = 80% of that height (72vh), so the
// editor/viewer is a comfortable portrait rectangle rather than a near-square.
// NB: DialogContent's base `sm:max-w-sm` (384px) must be overridden at the same
// `sm:` variant, or twMerge keeps it and the dialog stays narrow.
const DIALOG_SIZE =
  'flex h-[90vh] w-[72vh] max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] flex-col'

export function SystemPromptsManager({ prompts, versions, usage, versionUsage }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)

  const versionsOf = useCallback(
    (promptId: string) => versions.filter((v) => v.prompt_id === promptId),
    [versions],
  )

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
          const latest = versionsOf(p.id)[0]
          const draftEdited = latest ? latest.content !== p.content : p.content.trim().length > 0
          return (
            <div
              key={p.id}
              className="flex min-h-[160px] flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/15 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileTextIcon className="size-5" aria-hidden="true" />
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    title={latest ? `Latest published version` : 'Never published'}
                  >
                    {latest ? `v${latest.version}` : 'unpublished'}
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
              </div>

              <div className="min-w-0">
                <p className="truncate font-medium text-foreground" title={p.name}>
                  {p.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Created {formatDistanceToNow(p.created_at)}
                </p>
                {draftEdited && (
                  <p className="mt-0.5 text-xs font-medium text-amber-600">
                    {latest ? `Draft edited since v${latest.version}` : 'Draft not published yet'}
                  </p>
                )}
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Version history"
                  aria-label="Version history"
                  onClick={() => setMode({ kind: 'history', prompt: p })}
                >
                  <HistoryIcon className="size-3.5" />
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
          latestVersion={mode.kind === 'edit' ? versionsOf(mode.prompt.id)[0] : undefined}
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

      {mode?.kind === 'history' && (
        <VersionHistory
          prompt={mode.prompt}
          versions={versionsOf(mode.prompt.id)}
          versionUsage={versionUsage}
          onClose={() => setMode(null)}
        />
      )}
    </>
  )
}

// ── Create / Edit ────────────────────────────────────────────────────────────
function PromptEditor({
  initial,
  latestVersion,
  usageCount,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: SystemPrompt | null
  latestVersion?: SystemPromptVersion
  usageCount: number
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [note, setNote] = useState('')

  const save = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Give the prompt a name.')
      return
    }
    setSaving(true)
    try {
      if (initial) await updateSystemPrompt(initial.id, name.trim(), content)
      else await createSystemPrompt(name.trim(), content)
      toast.success(initial ? 'Draft saved — no bots affected' : 'Prompt created')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [initial, name, content, onSaved])

  // Save the draft, then freeze it as the next version.
  const publish = useCallback(async () => {
    if (!initial) return
    setSaving(true)
    try {
      await updateSystemPrompt(initial.id, name.trim() || initial.name, content)
      await publishSystemPrompt(initial.id, note)
      toast.success(`Published v${(latestVersion?.version ?? 0) + 1} — bots stay on their pinned version until switched`)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setSaving(false)
    }
  }, [initial, name, content, note, latestVersion, onSaved])

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
          <div className="flex items-center justify-between">
            <Label htmlFor="prompt-content">
              Draft (Markdown supported)
              {latestVersion && (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  — latest published: v{latestVersion.version}
                </span>
              )}
            </Label>
            <span
              className={cn(
                'text-xs tabular-nums',
                content.length > SYSTEM_PROMPT_MAX ? 'font-medium text-destructive' : 'text-muted-foreground',
              )}
            >
              {content.length.toLocaleString()} / {SYSTEM_PROMPT_MAX.toLocaleString()}
            </span>
          </div>
          <Textarea
            id="prompt-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Personality&#10;You are a friendly, helpful assistant for…"
            className="min-h-0 flex-1 resize-none font-mono text-sm leading-relaxed"
          />
        </div>

        {publishing && initial && (
          <div className="flex items-end gap-2 rounded-lg border bg-muted/40 p-2.5">
            <div className="flex-1 space-y-1">
              <Label htmlFor="publish-note" className="text-xs">
                What changed? (shown in version dropdowns)
              </Label>
              <Input
                id="publish-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. better upsell handling"
                maxLength={200}
                autoFocus
              />
            </div>
            <Button type="button" size="sm" onClick={publish} disabled={saving}>
              {saving ? 'Publishing…' : `Publish v${(latestVersion?.version ?? 0) + 1}`}
            </Button>
          </div>
        )}

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
            {initial && !publishing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPublishing(true)}
                disabled={saving || content.length > SYSTEM_PROMPT_MAX || !content.trim()}
              >
                <UploadIcon className="size-3.5" /> Publish…
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={saving || content.length > SYSTEM_PROMPT_MAX}
            >
              {saving ? 'Saving…' : initial ? 'Save draft' : 'Create prompt'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Version history ─────────────────────────────────────────────────────────
function VersionHistory({
  prompt,
  versions,
  versionUsage,
  onClose,
}: {
  prompt: SystemPrompt
  versions: SystemPromptVersion[]
  versionUsage: Record<string, VersionUsage[]>
  onClose: () => void
}) {
  const [viewing, setViewing] = useState<SystemPromptVersion | null>(null)
  const unversioned = versionUsage[`unversioned:${prompt.id}`] ?? []

  if (viewing) {
    return (
      <VersionContentViewer
        title={`${prompt.name} — v${viewing.version}`}
        content={viewing.content}
        onClose={() => setViewing(null)}
      />
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DIALOG_SIZE}>
        <DialogHeader>
          <DialogTitle>{prompt.name} — versions</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {versions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing published yet. Publish the draft to create v1.
            </p>
          )}
          {versions.map((v) => {
            const pinned = versionUsage[v.id] ?? []
            return (
              <div key={v.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                      v{v.version}
                    </span>
                    <span className="text-sm">{v.note ?? <span className="text-muted-foreground">No note</span>}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        pinned.length > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {pinned.length} bot{pinned.length === 1 ? '' : 's'}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setViewing(v)}>
                      <EyeIcon className="size-3.5" /> View
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Published {formatDistanceToNow(v.published_at)}
                </p>
                {pinned.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pinned.map((u) => `${u.botName} (${u.orgName})`).join(' · ')}
                  </p>
                )}
              </div>
            )
          })}
          {unversioned.length > 0 && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <p className="text-xs font-medium text-amber-700">
                Unversioned snapshot — linked to this prompt before versioning existed; pick a
                version in their config to pin them.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {unversioned.map((u) => `${u.botName} (${u.orgName})`).join(' · ')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── View (rendered Markdown) ───────────────────────────────────────────────────
function VersionContentViewer({
  title,
  content,
  onClose,
}: {
  title: string
  content: string
  onClose: () => void
}) {
  const html = useMemo(
    () => marked.parse(content || '_Empty prompt._', { async: false }) as string,
    [content],
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DIALOG_SIZE}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-5">
          <article className="article" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PromptViewer({ prompt, onClose }: { prompt: SystemPrompt; onClose: () => void }) {
  return <VersionContentViewer title={`${prompt.name} — draft`} content={prompt.content} onClose={onClose} />
}
