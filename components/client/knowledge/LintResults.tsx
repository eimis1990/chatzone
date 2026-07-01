'use client'

import { XIcon, AlertTriangleIcon, ClockIcon, CircleHelpIcon, CheckCircle2Icon } from 'lucide-react'
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
}

export function LintResults({ findings, scanned, onClose }: LintResultsProps) {
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
          aria-label="Dismiss"
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
          {findings.map((f, i) => {
            const { label, icon: Icon } = TYPE_META[f.type]
            return (
              <li key={i} className="rounded-lg border bg-card p-3">
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
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
