import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/date-utils'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Whether a bot's widget is embedded and live, derived from `last_seen_at`
 * (stamped when the widget loads its config on a real page):
 *   - never seen     → "Not embedded" (grey)
 *   - seen ≤ 7 days   → "Live"          (green, pulsing)
 *   - seen > 7 days   → "Idle"          (amber)
 */
export function LiveIndicator({
  lastSeenAt,
  className,
}: {
  lastSeenAt: string | null
  className?: string
}) {
  const seen = lastSeenAt ? new Date(lastSeenAt).getTime() : 0
  const ever = seen > 0
  const live = ever && Date.now() - seen < WEEK_MS

  const label = live ? 'Live' : ever ? 'Idle' : 'Not embedded'
  const dot = live ? 'bg-green-500' : ever ? 'bg-amber-500' : 'bg-muted-foreground/40'
  const tone = live ? 'text-green-600' : ever ? 'text-amber-600' : 'text-muted-foreground'
  const title = ever
    ? `Widget last loaded ${formatDistanceToNow(lastSeenAt as string)}`
    : 'Widget hasn’t loaded yet — add the embed snippet to your site'

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium', tone, className)}
      title={title}
    >
      <span className={cn('size-1.5 rounded-full', dot, live && 'animate-pulse')} aria-hidden="true" />
      {label}
    </span>
  )
}
