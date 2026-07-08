'use client'

import {
  XIcon,
  AlertTriangleIcon,
  ClockIcon,
  CircleHelpIcon,
  CheckCircle2Icon,
  Wand2Icon,
  PencilIcon,
  EyeOffIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LintFinding, LintFindingType, LintSeverity } from '@/lib/types'

const TYPE_META: Record<LintFindingType, { label: string; icon: LucideIcon }> = {
  contradiction: { label: 'Contradiction', icon: AlertTriangleIcon },
  stale: { label: 'Possibly outdated', icon: ClockIcon },
  gap: { label: 'Missing info', icon: CircleHelpIcon },
}

const SEVERITY_STYLE: Record<LintSeverity, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

interface LintResultsProps {
  findings: LintFinding[]
  scanned: number
  onClose: () => void
  /** Open the guided resolution dialog for a finding. */
  onResolve: (finding: LintFinding) => void
  /** Dismiss a finding (persisted per bot by its fingerprint). */
  onDismiss: (fingerprint: string) => void
}

export function LintResults({ findings, scanned, onClose, onResolve, onDismiss }: LintResultsProps) {
  const issues = findings.filter((f) => f.type !== 'gap')
  const gaps = findings.filter((f) => f.type === 'gap')

  return (
    <div className="border-b bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Knowledge check</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Scanned {scanned} {scanned === 1 ? 'topic' : 'topics'} ·{' '}
            {issues.length > 0
              ? `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} to review`
              : 'no conflicts or stale content found'}
            {gaps.length > 0 && ` · ${gaps.length} missing ${gaps.length === 1 ? 'topic' : 'topics'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {findings.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border bg-card p-3 text-sm text-foreground">
          <CheckCircle2Icon className="size-4 shrink-0 text-green-600" />
          Your knowledge base looks consistent and up to date.
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {findings.map((f) => {
            const { label, icon: Icon } = TYPE_META[f.type]
            return (
              <li key={f.id} className="rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      SEVERITY_STYLE[f.severity],
                    )}
                  >
                    <Icon className="size-3" aria-hidden="true" />
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">{f.topic}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-foreground">{f.summary}</p>
                {f.detail && <p className="mt-0.5 text-sm text-muted-foreground">{f.detail}</p>}
                {f.evidence.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {f.evidence.map((q, j) => (
                      <blockquote
                        key={j}
                        className="border-l-2 border-muted-foreground/30 pl-2 text-xs italic text-muted-foreground [overflow-wrap:anywhere]"
                      >
                        “{q}”
                      </blockquote>
                    ))}
                  </div>
                )}

                {f.suggestedFix && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md bg-primary/5 p-2 text-xs text-foreground">
                    <Wand2Icon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                      <span className="font-medium">Suggested fix:</span> {f.suggestedFix}
                    </span>
                  </div>
                )}

                {/* Actions: open the guided resolution dialog, or dismiss. */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {f.type !== 'gap' && (
                    <button
                      type="button"
                      onClick={() => onResolve(f)}
                      className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <PencilIcon className="size-3 shrink-0" aria-hidden="true" />
                      Resolve
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDismiss(f.id)}
                    className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <EyeOffIcon className="size-3" aria-hidden="true" />
                    Dismiss
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
