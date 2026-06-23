import type { LucideIcon } from 'lucide-react'
import { ArrowUpRightIcon, ArrowDownRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatAccent = 'green' | 'blue' | 'violet' | 'amber' | 'rose' | 'slate'

// Each accent maps to an icon tint and the colour of the soft corner glow.
const ACCENTS: Record<StatAccent, { icon: string; glow: string }> = {
  green: { icon: 'text-primary', glow: 'bg-primary' },
  blue: { icon: 'text-blue-500', glow: 'bg-blue-400' },
  violet: { icon: 'text-violet-500', glow: 'bg-violet-400' },
  amber: { icon: 'text-amber-500', glow: 'bg-amber-400' },
  rose: { icon: 'text-rose-500', glow: 'bg-rose-400' },
  slate: { icon: 'text-slate-500', glow: 'bg-slate-400' },
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  accent?: StatAccent
  /** Percent change vs. the previous period. */
  trend?: { value: number; direction: 'up' | 'down' } | null
  /** Slightly stronger corner glow to draw the eye (same 1px border). */
  highlight?: boolean
}

export function StatCard({ label, value, sub, icon: Icon, accent = 'green', trend, highlight }: StatCardProps) {
  const a = ACCENTS[accent]
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm">
      {/* Soft glow bleeding from the top-right corner */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 size-28 rounded-full blur-2xl',
          a.glow,
          highlight ? 'opacity-50' : 'opacity-30',
        )}
      />

      <div className="relative flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && <Icon className={cn('size-5 shrink-0', a.icon)} aria-hidden="true" />}
      </div>
      <p className="relative mt-3 text-3xl font-bold tabular-nums">{value}</p>
      <div className="relative mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
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
