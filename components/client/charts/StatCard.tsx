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

// Icon chip tints for the panel tiles (quiet by default, solid when highlighted).
const TILE_ACCENTS: Record<StatAccent, { icon: string; chip: string; solid: string }> = {
  green: { icon: 'text-primary', chip: 'bg-primary/10', solid: 'bg-primary text-primary-foreground' },
  blue: { icon: 'text-blue-500', chip: 'bg-blue-500/10', solid: 'bg-blue-500 text-white' },
  violet: { icon: 'text-violet-500', chip: 'bg-violet-500/10', solid: 'bg-violet-500 text-white' },
  amber: { icon: 'text-amber-500', chip: 'bg-amber-500/10', solid: 'bg-amber-500 text-white' },
  rose: { icon: 'text-rose-500', chip: 'bg-rose-500/10', solid: 'bg-rose-500 text-white' },
  slate: { icon: 'text-slate-500', chip: 'bg-slate-500/10', solid: 'bg-slate-500 text-white' },
}

export interface StatTileData {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  accent?: StatAccent
  trend?: { value: number; direction: 'up' | 'down' } | null
  highlight?: boolean
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'green',
  trend,
  highlight,
  tone = 'accent',
}: StatTileData & { tone?: 'accent' | 'dark' }) {
  const a = TILE_ACCENTS[accent]
  return (
    <div className="bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg',
              tone === 'dark'
                ? 'bg-[#101213] text-white'
                : highlight
                  ? a.solid
                  : cn(a.chip, a.icon),
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2.5 text-3xl font-bold tabular-nums">{value}</p>
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

// Breakpoint column presets (literal classes — Tailwind can't see computed ones).
const GRID_LAYOUTS = {
  default: { classes: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4', counts: [2, 3, 4] },
  /** Compact: everything on one line from xl up. */
  six: { classes: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6', counts: [2, 3, 6] },
} as const

/**
 * One white panel holding every stat in a hairline-divided grid. Invisible
 * filler cells complete the last row per breakpoint, so an uneven stat count
 * never leaves a ragged edge. `className` lets a parent flatten the chrome to
 * embed the grid inside a larger panel.
 */
export function StatTileGrid({
  stats,
  layout = 'default',
  tone = 'accent',
  className,
}: {
  stats: StatTileData[]
  layout?: keyof typeof GRID_LAYOUTS
  /** 'dark' renders every icon chip as white-on-dark instead of accent tints. */
  tone?: 'accent' | 'dark'
  className?: string
}) {
  const { classes, counts } = GRID_LAYOUTS[layout]
  const [fillSm, fillMd, fillXl] = counts.map((cols) => (cols - (stats.length % cols)) % cols)
  return (
    <div className={cn('overflow-hidden rounded-3xl border bg-card', className)}>
      <div className={cn('grid gap-px bg-border', classes)}>
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} tone={tone} />
        ))}
        {Array.from({ length: Math.max(fillSm, fillMd, fillXl) }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className={cn(
              'bg-card',
              index < fillSm ? 'block' : 'hidden',
              index < fillMd ? 'md:block' : 'md:hidden',
              index < fillXl ? 'xl:block' : 'xl:hidden',
            )}
          />
        ))}
      </div>
    </div>
  )
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
