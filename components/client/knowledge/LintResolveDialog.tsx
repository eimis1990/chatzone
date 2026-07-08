'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon, SaveIcon, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { LintFinding } from '@/lib/types'

interface Props {
  finding: LintFinding
  botId: string
  /** Called after the finding is resolved/dismissed (removes it from the list). */
  onResolved: (fingerprint: string) => void
  /** Re-fetch sources after a content edit + re-index. */
  onSourcesChanged?: () => void
  onClose: () => void
}

type Choice = { kind: 'pick'; index: number } | { kind: 'fix' } | { kind: 'keep' }

/**
 * Guided resolution for a knowledge-check finding. The owner picks which
 * conflicting line is correct (or "keep both"), and Save & re-index applies the
 * choice: an AI edit rewrites the affected source(s) to match, then re-indexes.
 * "Keep both" just marks the finding resolved without touching content.
 */
export function LintResolveDialog({ finding, botId, onResolved, onSourcesChanged, onClose }: Props) {
  const [choice, setChoice] = useState<Choice | null>(null)
  const [saving, setSaving] = useState(false)

  const hasSources = finding.sources.length > 0
  const isConflict = finding.evidence.length >= 2

  async function handleSave() {
    if (!choice || saving) return
    setSaving(true)
    try {
      if (choice.kind === 'keep') {
        await fetch('/api/knowledge/lint/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId, fingerprint: finding.id }),
        })
        toast.success('Marked as resolved')
        onResolved(finding.id)
        onClose()
        return
      }

      // Build the correction instruction from the choice.
      const instruction =
        choice.kind === 'pick'
          ? `Make this statement the single, authoritative version and correct it everywhere: "${finding.evidence[choice.index]}". Reconcile or remove the conflicting statement(s): ${finding.evidence
              .filter((_, j) => j !== choice.index)
              .map((q) => `"${q}"`)
              .join('; ')}.${finding.suggestedFix ? ` Guidance: ${finding.suggestedFix}` : ''}`
          : finding.suggestedFix || `Fix: ${finding.summary}`

      const res = await fetch('/api/knowledge/lint/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          sourceIds: finding.sources.map((s) => s.id),
          instruction,
          fingerprint: finding.id,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; edited?: number; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Could not apply the fix')

      toast.success(data.edited ? 'Fixed and re-indexed' : 'Marked as resolved')
      onSourcesChanged?.()
      onResolved(finding.id)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not apply the fix')
      setSaving(false)
    }
  }

  const selected = (c: Choice) =>
    choice?.kind === c.kind && (c.kind !== 'pick' || (choice as { index: number }).index === c.index)

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="gap-0 p-6 sm:max-w-lg">
        <DialogTitle className="text-lg">Resolve: {finding.summary}</DialogTitle>
        <DialogDescription className="mt-1">
          {isConflict
            ? 'Choose the correct version. We’ll update the source to match and re-index it.'
            : 'Apply the suggested fix to the source and re-index it, or mark it resolved.'}
        </DialogDescription>

        <div className="mt-4 space-y-2">
          {isConflict &&
            finding.evidence.map((q, i) => (
              <OptionButton
                key={i}
                active={selected({ kind: 'pick', index: i })}
                disabled={!hasSources || saving}
                onClick={() => setChoice({ kind: 'pick', index: i })}
                title="Use this version"
                body={`“${q}”`}
              />
            ))}

          {!isConflict && (
            <OptionButton
              active={selected({ kind: 'fix' })}
              disabled={!hasSources || saving}
              onClick={() => setChoice({ kind: 'fix' })}
              title="Apply the suggested fix"
              body={finding.suggestedFix ?? finding.detail}
            />
          )}

          <OptionButton
            active={selected({ kind: 'keep' })}
            disabled={saving}
            onClick={() => setChoice({ kind: 'keep' })}
            title={isConflict ? 'Keep both — this isn’t a conflict' : 'Leave as is — mark resolved'}
            body="No changes to your content; just clears this issue."
          />
        </div>

        {!hasSources && isConflict && (
          <p className="mt-3 text-xs text-muted-foreground">
            This finding isn’t linked to an editable source, so only “keep both” is available.
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!choice || saving}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            {choice?.kind === 'keep' ? 'Save' : 'Save & re-index'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function OptionButton({
  active,
  disabled,
  onClick,
  title,
  body,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  body: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'flex w-full items-start gap-2 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'border-primary bg-primary/5' : 'hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
          active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
        )}
      >
        {active && <CheckIcon className="size-3" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground [overflow-wrap:anywhere]">{body}</span>
      </span>
    </button>
  )
}
