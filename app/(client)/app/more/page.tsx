import Link from 'next/link'
import { BarChart3Icon, MessagesSquareIcon, MonitorIcon, ChevronRightIcon } from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/client/SignOutButton'
import type { Bot } from '@/lib/types'

/** Mobile "More" tab: read-only deep-dives (Analytics, Conversations) per bot,
 *  account, and a pointer to the desktop portal for everything else. */
export default async function MorePage() {
  const user = await requireRole('client')
  const orgId = (await getUserOrgIds())[0] ?? null
  const supabase = await createServerClient()
  const { data } = orgId
    ? await supabase.from('bots').select('id, name').eq('org_id', orgId).order('created_at')
    : { data: [] }
  const bots = (data ?? []) as Pick<Bot, 'id' | 'name'>[]

  const row = 'flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/40'

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-lg font-semibold">More</h1>

      {bots.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Analytics</h2>
          <div className="space-y-2">
            {bots.map((b) => (
              <Link key={b.id} href={`/app/bots/${b.id}/analytics`} className={row}>
                <span className="flex items-center gap-2.5 truncate">
                  <BarChart3Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{b.name}</span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>

          <h2 className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Conversations</h2>
          <div className="space-y-2">
            {bots.map((b) => (
              <Link key={b.id} href={`/app/bots/${b.id}/conversations`} className={row}>
                <span className="flex items-center gap-2.5 truncate">
                  <MessagesSquareIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{b.name}</span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Everything build-related lives on desktop. */}
      <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-4">
        <MonitorIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-medium">Set up on a computer</p>
          <p className="mt-0.5 text-muted-foreground">
            Configuring bots, knowledge, embedding, team and billing works best on the desktop
            version at <span className="font-medium text-foreground">app.loqara.com</span>.
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t pt-5">
        <p className="truncate px-1 text-sm text-muted-foreground" title={user.email ?? ''}>
          {user.email}
        </p>
        <SignOutButton />
      </div>
    </div>
  )
}
