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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Bots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your AI chatbots.
          </p>
        </div>
        {orgId && <CreateBotDialog orgId={orgId} />}
      </div>

      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center gap-3">
          <BotIcon className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No bots yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first bot to get started.
            </p>
          </div>
          {orgId && <CreateBotDialog orgId={orgId} />}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Link
              key={bot.id}
              href={`/app/bots/${bot.id}/configure`}
              className="group block focus:outline-none"
            >
              <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1">{bot.name}</CardTitle>
                    <Badge
                      variant={bot.status === 'active' ? 'default' : 'secondary'}
                      className="shrink-0 capitalize"
                    >
                      {bot.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <SettingsIcon className="size-3" />
                    Configure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {bot.config.greeting}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
