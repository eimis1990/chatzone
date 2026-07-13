import Link from 'next/link'
import {
  ArrowUpRightIcon,
  BotIcon,
  MessagesSquareIcon,
  SparklesIcon,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from '@/lib/date-utils'

export interface ClientCardOrg {
  org_id: string
  org_name: string
  status: string
  bots: number
  conversations: number
  leads: number
  last_activity_at: string | null
}

/**
 * A client organisation card — shown on the owner Clients list and Dashboard.
 * `accent` is the client's own brand color (their first bot's launcher/primary
 * color): it tints the corner glow and the monogram so each card carries the
 * client's identity. Falls back to the app primary.
 */
export function ClientCard({ org, accent }: { org: ClientCardOrg; accent?: string }) {
  return (
    <Link href={`/owner/clients/${org.org_id}`} className="group block h-full focus:outline-none">
      <div className="relative h-full overflow-hidden rounded-2xl border bg-card p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        {/* Brand-colored glow bleeding from the top-right corner. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
          style={{ backgroundColor: accent ?? 'var(--primary)' }}
        />
        <ArrowUpRightIcon
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-4 z-10 size-4 -translate-x-1 translate-y-1 text-gray-700 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
        />

        <div className="relative flex items-start gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary"
            style={
              accent
                ? {
                    backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                    color: accent,
                  }
                : undefined
            }
          >
            {org.org_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 pr-5">
              <p className="truncate font-semibold">{org.org_name}</p>
              <Badge
                variant={org.status === 'active' ? 'default' : 'secondary'}
                className="shrink-0 capitalize"
              >
                {org.status}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {org.last_activity_at
                ? `Active ${formatDistanceToNow(org.last_activity_at)}`
                : 'No activity yet'}
            </p>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <StatTile icon={BotIcon} label="Bots" value={org.bots} />
          <StatTile icon={MessagesSquareIcon} label="Chats" value={org.conversations} />
          <StatTile icon={SparklesIcon} label="Leads" value={org.leads} />
        </div>
      </div>
    </Link>
  )
}

/** A single stat cell — big number over an icon + label. */
function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2.5 text-center">
      <div className="text-xl font-semibold tabular-nums text-foreground">{value.toLocaleString()}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </div>
    </div>
  )
}
