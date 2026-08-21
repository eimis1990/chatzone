import Link from 'next/link'
import { SettingsIcon, BarChart3Icon, PlusIcon } from 'lucide-react'
import { CreateBotDialog } from '@/components/client/CreateBotDialog'
import { Reveal } from '@/components/client/Reveal'
import { DeleteBotButton } from '@/components/client/DeleteBotButton'
import { BotStatusButton } from '@/components/client/BotStatusButton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LiveIndicator } from '@/components/LiveIndicator'
import { readableTextColor } from '@/lib/utils'
import type { Bot } from '@/lib/types'

/**
 * The org's bot cards + "Create bot" tile. Shared by Home and /app/bots so
 * managing bots (pause/activate, delete, configure) has a dedicated screen
 * without Home losing its overview.
 */
export function BotCards({ bots, orgId }: { bots: Bot[]; orgId: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      {bots.map((bot, index) => {
        const lang = bot.config.defaultLanguage ?? 'en'
        const greeting =
          bot.config.content?.[lang]?.greeting ?? bot.config.content?.en?.greeting ?? ''
        const avatar = bot.config.avatarUrl || bot.config.botAvatarUrl
        // Tint the status badge with the bot's own accent, picking dark/light
        // text the same way the chat widget does.
        const primaryColor = bot.config.theme?.primaryColor ?? '#4f46e5'
        const isActive = bot.status === 'active'
        // Same card, two tap targets: Configure on desktop (build), Analytics
        // on mobile (monitor). Only one link is visible per breakpoint.
        const card = (Icon: typeof SettingsIcon, label: string) => (
          <Card
            className={`relative flex h-full flex-col overflow-hidden rounded-3xl border ring-0 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring ${
              // Paused bots read as switched off: page-grey surface, no glow.
              isActive ? '' : 'bg-muted'
            }`}
          >
            {isActive && (
              /* Brand-colored glow in the top-right corner (matches demo cards). */
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
                style={{ backgroundColor: primaryColor }}
              />
            )}
            <CardHeader className="relative z-10">
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
                    <Icon className="size-3" />
                    {label}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {/* Greeting grows; the status + delete row pins to the card bottom
                so short and long greetings align across the grid. */}
            <CardContent className="relative z-10 flex flex-1 flex-col gap-3">
              <p className="line-clamp-1 text-sm text-muted-foreground">{greeting}</p>
              <div className="mt-auto flex items-center justify-between">
                <LiveIndicator lastSeenAt={bot.last_seen_at} />
                <div className="flex items-center gap-1">
                  <BotStatusButton botId={bot.id} botName={bot.name} status={bot.status} />
                  <DeleteBotButton botId={bot.id} botName={bot.name} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
        return (
          <Reveal key={bot.id} delay={Math.min(0.06 + index * 0.06, 0.3)}>
            <Link href={`/app/bots/${bot.id}/configure`} className="group hidden focus:outline-none md:block">
              {card(SettingsIcon, 'Configure')}
            </Link>
            <Link href={`/app/bots/${bot.id}/analytics`} className="group block focus:outline-none md:hidden">
              {card(BarChart3Icon, 'View analytics')}
            </Link>
          </Reveal>
        )
      })}
      {orgId && (
        // Creating a bot is a desktop (build) task — slim row under the list.
        <Reveal delay={Math.min(0.12 + bots.length * 0.06, 0.36)}>
        <CreateBotDialog
          orgId={orgId}
          trigger={
            <button
              type="button"
              className="group hidden h-12 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border bg-card/40 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
            >
              <PlusIcon className="size-4" />
              Create bot
            </button>
          }
        />
        </Reveal>
      )}
    </div>
  )
}
