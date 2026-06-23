import type { LucideIcon } from 'lucide-react'
import { ArrowUpRightIcon, ArrowDownRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatAccent = 'green' | 'blue' | 'violet' | 'amber' | 'rose' | 'slate'

const ACCENTS: Record<StatAccent, string> = {
  green: 'bg-primary/10 text-primary',
  blue: 'bg-blue-500/10 text-blue-600',
  violet: 'bg-violet-500/10 text-violet-600',
  amber: 'bg-amber-500/10 text-amber-600',
  rose: 'bg-rose-500/10 text-rose-600',
  slate: 'bg-slate-500/10 text-slate-600',
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  accent?: StatAccent
  /** Percent change vs. the previous period. */
  trend?: { value: number; direction: 'up' | 'down' } | null
  /** Render with a subtle brand gradient to draw the eye. */
  highlight?: boolean
}

export function StatCard({ label, value, sub, icon: Icon, accent = 'green', trend, highlight }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-shadow hover:shadow-sm',
        highlight && 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-primary/20',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', ACCENTS[accent])}>
            <Icon className="size-5" aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              trend.direction === 'up' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700',
            )}
          >
            {trend.direction === 'up' ? (
              <ArrowUpRightIcon className="size-3" />
            ) : (
              <ArrowDownRightIcon className="size-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}
