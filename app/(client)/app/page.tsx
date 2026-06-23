import Link from 'next/link'
import { BotIcon, SettingsIcon } from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { CreateBotDialog } from '@/components/client/CreateBotDialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Home</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage your AI chatbots.</p>
        </div>
        {orgId && <CreateBotDialog orgId={orgId} />}
      </div>

      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card py-20 text-center">
          <BotIcon className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No bots yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create your first bot to get started.</p>
          </div>
          {orgId && <CreateBotDialog orgId={orgId} />}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => {
            const lang = bot.config.defaultLanguage ?? 'en'
            const greeting =
              bot.config.content?.[lang]?.greeting ?? bot.config.content?.en?.greeting ?? ''
            const avatar = bot.config.avatarUrl || bot.config.botAvatarUrl
            return (
              <Link
                key={bot.id}
                href={`/app/bots/${bot.id}/configure`}
                className="group block focus:outline-none"
              >
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                  <CardHeader>
                    <div className="flex items-center gap-3">
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
                        <CardTitle className="line-clamp-1">{bot.name}</CardTitle>
                        <CardDescription className="mt-0.5 flex items-center gap-1 text-xs">
                          <SettingsIcon className="size-3" />
                          Configure
                        </CardDescription>
                      </div>
                      <Badge
                        variant={bot.status === 'active' ? 'default' : 'secondary'}
                        className="shrink-0 capitalize"
                      >
                        {bot.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{greeting}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
