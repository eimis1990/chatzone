import Link from 'next/link'
import { BotIcon, MessagesSquareIcon, SparklesIcon, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

/** A client organisation card — shown on the owner Clients list and Dashboard. */
export function ClientCard({ org }: { org: ClientCardOrg }) {
  return (
    <Link href={`/owner/clients/${org.org_id}`} className="group block focus:outline-none">
      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
              {org.org_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-1">{org.org_name}</CardTitle>
                <Badge variant={org.status === 'active' ? 'default' : 'secondary'} className="shrink-0 capitalize">
                  {org.status}
                </Badge>
              </div>
              <CardDescription className="mt-0.5 text-xs">
                {org.last_activity_at ? `Active ${formatDistanceToNow(org.last_activity_at)}` : 'No activity yet'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <StatTile icon={BotIcon} label="Bots" value={org.bots} />
            <StatTile icon={MessagesSquareIcon} label="Chats" value={org.conversations} />
            <StatTile icon={SparklesIcon} label="Leads" value={org.leads} />
          </div>
        </CardContent>
      </Card>
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
