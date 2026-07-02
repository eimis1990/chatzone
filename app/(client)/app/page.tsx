import Link from 'next/link'
import { PlusIcon, SettingsIcon, SparklesIcon, ArrowRightIcon } from 'lucide-react'
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

      {/* First-run: guided onboarding front and center (bots exist → normal grid). */}
      {orgId && bots.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <SparklesIcon className="size-3.5" />
              Guided setup
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Set up your first bot</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell us about your business, we&apos;ll teach the bot from your website, match your
              brand, and hand you the install snippet — all in about five minutes.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/app/onboarding"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Start guided setup
                <ArrowRightIcon className="size-4" />
              </Link>
              <CreateBotDialog
                orgId={orgId}
                trigger={
                  <button
                    type="button"
                    className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    or create a blank bot
                  </button>
                }
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {orgId && bots.length > 0 && (
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
