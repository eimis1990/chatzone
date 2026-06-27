import Link from 'next/link'
import { PlusIcon, SettingsIcon } from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { CreateBotDialog } from '@/components/client/CreateBotDialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LiveIndicator } from '@/components/LiveIndicator'
import { readableTextColor } from '@/lib/utils'
import type { Bot } from '@/lib/types'

export default async function BotsPage() {
  await requireRole('client')

  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null

  let bots: Bot[] = []

  if (orgId) {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('bots')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    bots = (data ?? []) as Bot[]
  }

  return (
    <div className="max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Home</h1>
        <p className="text-sm text-muted-foreground">Create and manage your AI chatbots.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {orgId && (
          <CreateBotDialog
            orgId={orgId}
            trigger={
              <button
                type="button"
                className="group flex h-full min-h-[152px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-11 items-center justify-center rounded-lg border border-dashed border-current">
                  <PlusIcon className="size-5" />
                </span>
                <span className="text-sm font-medium">Create bot</span>
              </button>
            }
          />
        )}
          {bots.map((bot) => {
            const lang = bot.config.defaultLanguage ?? 'en'
            const greeting =
              bot.config.content?.[lang]?.greeting ?? bot.config.content?.en?.greeting ?? ''
            const avatar = bot.config.avatarUrl || bot.config.botAvatarUrl
            // Tint the status badge with the bot's own accent, picking dark/light
            // text the same way the chat widget does.
            const primaryColor = bot.config.theme?.primaryColor ?? '#4f46e5'
            const isActive = bot.status === 'active'
            return (
              <Link
                key={bot.id}
                href={`/app/bots/${bot.id}/configure`}
                className="group block focus:outline-none"
              >
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt=""
                          className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-black/5"
                        />
                      ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                          {bot.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="line-clamp-1">{bot.name}</CardTitle>
                          <Badge
                            variant={isActive ? 'default' : 'secondary'}
                            className="shrink-0 capitalize"
                            style={
                              isActive
                                ? { backgroundColor: primaryColor, color: readableTextColor(primaryColor) }
                                : undefined
                            }
                          >
                            {bot.status}
                          </Badge>
                        </div>
                        <CardDescription className="mt-0.5 flex items-center gap-1 text-xs">
                          <SettingsIcon className="size-3" />
                          Configure
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{greeting}</p>
                    <LiveIndicator lastSeenAt={bot.last_seen_at} />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
      </div>
    </div>
  )
}
