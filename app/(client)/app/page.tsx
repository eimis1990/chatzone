import Link from 'next/link'
import {
  PlusIcon,
  SettingsIcon,
  ArrowRightIcon,
  BarChart3Icon,
  LinkIcon,
  MessagesSquareIcon,
  MonitorIcon,
  PanelTopOpenIcon,
  UserPlusIcon,
  GlobeIcon,
  PaletteIcon,
  Code2Icon,
} from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { entitlementsFor } from '@/lib/entitlements'
import { conversationsThisMonth } from '@/lib/usage'
import { getOrgAnalyticsRollup, type OrgAnalyticsRollup } from '@/lib/analytics/org-rollup'
import type { Plan } from '@/lib/types'
import { CreateBotDialog } from '@/components/client/CreateBotDialog'
import { Reveal } from '@/components/client/Reveal'
import { DeleteBotButton } from '@/components/client/DeleteBotButton'
import { BotStatusButton } from '@/components/client/BotStatusButton'
import { StatTileGrid, type StatTileData } from '@/components/client/charts/StatCard'
import { OrgBotComparisonChart } from '@/components/client/charts/OrgBotComparisonChart'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LiveIndicator } from '@/components/LiveIndicator'
import { readableTextColor } from '@/lib/utils'
import type { Bot } from '@/lib/types'

/** Right-rail content per plan: its fox, the next-tier pitch, and the CTA. */
const PLAN_RAILS: Record<Plan, { image: string; title: string; pitch: string; cta: string }> = {
  free: {
    image: '/onboarding/fox-upgrade.webp',
    title: "You're on the Free plan",
    pitch: 'Starter unlocks 1,500 conversations, 2 bots, all languages, and lead capture.',
    cta: 'See plans',
  },
  starter: {
    image: '/plans/fox-plan-starter.webp',
    title: "You're on Starter",
    pitch: 'Growth unlocks 4,000 conversations, up to 5 bots, priority support, and advanced analytics.',
    cta: 'See plans',
  },
  growth: {
    image: '/plans/fox-plan-growth.webp',
    title: "You're on Growth",
    pitch: 'Scale unlocks 12,000 conversations, unlimited bots, teams & roles, and a priority SLA.',
    cta: 'See plans',
  },
  scale: {
    image: '/plans/fox-plan-scale.webp',
    title: "You're on Scale",
    pitch: 'The top self-serve tier — manage seats, billing, and add-ons any time.',
    cta: 'Manage subscription',
  },
  enterprise: {
    image: '/plans/fox-plan-scale.webp',
    title: "You're on Enterprise",
    pitch: 'Custom limits and dedicated support — reach out any time for adjustments.',
    cta: 'Manage subscription',
  },
}

/** One add-on gets the spotlight per page load — light marketing, rotating. */
const ADDON_SPOTLIGHTS = [
  {
    id: 'voice',
    image: '/addons/fox-addon-voice.webp',
    title: 'Voice agent',
    copy: 'Let visitors talk to your assistant — live voice calls, answered from your knowledge base.',
  },
  {
    id: 'visualizer',
    image: '/addons/fox-addon-visualizer.webp',
    title: 'Product visualizer',
    copy: 'Visitors upload a room photo and see your products placed right in it.',
  },
  {
    id: 'messenger',
    image: '/addons/fox-addon-messenger.webp',
    title: 'Messenger channel',
    copy: 'Answer Facebook Messenger with the same bot — same knowledge, same tone.',
  },
  {
    id: 'instagram',
    image: '/addons/fox-addon-instagram.webp',
    title: 'Instagram channel',
    copy: 'Turn Instagram DMs into answered questions and captured leads.',
  },
]

/** One cell of the conversion snapshot's hairline grid. */
function RateTile({ label, value, detail }: { label: string; value: number; detail: string }) {
  const pct = Math.max(0, value)
  return (
    <div className="bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-xl font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export default async function BotsPage() {
  await requireRole('client')

  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null

  let bots: Bot[] = []
  let planInfo: { plan: Plan; used: number; limit: number } | null = null
  let rollup: OrgAnalyticsRollup | null = null

  if (orgId) {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('bots')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    bots = (data ?? []) as Bot[]

    if (bots.length > 0) {
      // Plan rail: current tier + live usage (every tier gets its own pitch).
      const { data: org } = await supabase
        .from('organizations')
        .select('plan')
        .eq('id', orgId)
        .single<{ plan: Plan | null }>()
      const plan = (org?.plan ?? 'free') as Plan
      const used = await conversationsThisMonth(createServiceClient(), orgId)
      planInfo = { plan, used, limit: entitlementsFor(plan).conversations }

      // Org analytics live on Home now (30-day window).
      rollup = await getOrgAnalyticsRollup(supabase, orgId, 30)
    }
  }

  const rail = planInfo ? PLAN_RAILS[planInfo.plan] : null
  // Server component: a fresh pick per request (the page is auth-dynamic).
  const spotlight = ADDON_SPOTLIGHTS[Math.floor(Math.random() * ADDON_SPOTLIGHTS.length)]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Reveal>
        <h1 className="text-lg font-semibold">Home</h1>
        <p className="text-sm text-muted-foreground">Create and manage your AI chatbots.</p>
      </Reveal>

      {/* Zero-bots on mobile: bot creation is a desktop job, so point them there. */}
      {orgId && bots.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-4 md:hidden">
          <MonitorIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">Create your first bot on a computer</p>
            <p className="mt-0.5 text-muted-foreground">
              Setting up a bot works best on the desktop version at{' '}
              <span className="font-medium text-foreground">app.loqara.com</span>. Once it&apos;s live,
              monitor and reply from here.
            </p>
          </div>
        </div>
      )}

      {/* First-run: guided onboarding front and center (desktop only). */}
      {orgId && bots.length === 0 && (
        <div className="relative hidden overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background md:block">
          <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-2xl p-8 lg:p-10">
              <h2 className="text-4xl font-bold tracking-tight text-balance xl:text-5xl">
                Meet your new teammate —{' '}
                <span className="text-primary">live in five minutes</span>
              </h2>
              <p className="mt-3 max-w-lg text-base text-muted-foreground">
                Tell us about your business and we&apos;ll do the busywork — you just review and go
                live.
              </p>
              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <GlobeIcon className="size-4 text-primary" aria-hidden="true" />
                  Learns from your website
                </li>
                <li className="flex items-center gap-2">
                  <PaletteIcon className="size-4 text-primary" aria-hidden="true" />
                  Matches your brand
                </li>
                <li className="flex items-center gap-2">
                  <Code2Icon className="size-4 text-primary" aria-hidden="true" />
                  Install snippet ready
                </li>
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  href="/app/onboarding"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/85 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            {/* Doodle fox mascot; multiply blend melts its white canvas into the card gradient. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/onboarding-fox-doodle.webp"
              alt=""
              aria-hidden="true"
              className="pointer-events-none hidden h-72 w-auto select-none justify-self-end pr-8 mix-blend-multiply lg:block xl:h-80"
            />
          </div>
        </div>
      )}

      {bots.length > 0 && (
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Left column: the bot list (rows — most orgs have 1-2 bots) + analytics. */}
      <div className="min-w-0 space-y-6">
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

        {/* ── Org analytics (30-day window) — fills the column beside the rail ── */}
        {rollup && rollup.rows.length > 0 && (
          <section aria-label="Analytics across all bots" className="space-y-4 pt-2">
            <Reveal delay={0.22} className="border-b pb-3">
              <h2 className="text-xl font-semibold">Analytics</h2>
              <p className="text-sm text-muted-foreground">All bots side by side, last 30 days.</p>
            </Reveal>

            <Reveal delay={0.28}>
            <StatTileGrid
              stats={[
                {
                  label: 'Widget opens',
                  value: rollup.totals.widgetOpens,
                  icon: PanelTopOpenIcon,
                  accent: 'violet',
                  sub: `${rollup.activeBots} of ${rollup.rows.length} ${rollup.rows.length === 1 ? 'bot' : 'bots'} had activity`,
                } satisfies StatTileData,
                {
                  label: 'Conversations',
                  value: rollup.totals.conversations,
                  icon: MessagesSquareIcon,
                  accent: 'green',
                  sub: `${rollup.chatStartRate}% of opens started a chat`,
                },
                {
                  label: 'Leads captured',
                  value: rollup.totals.leads,
                  icon: UserPlusIcon,
                  accent: 'blue',
                  sub: `${rollup.leadCaptureRate}% of conversations became leads`,
                },
                {
                  label: 'Link clicks',
                  value: rollup.totals.linkClicks,
                  icon: LinkIcon,
                  accent: 'amber',
                  sub: 'links followed from bot replies',
                },
              ]}
            />
            </Reveal>

            {/* Bot activity — full width of the column. */}
            <Reveal delay={0.36} className="overflow-hidden rounded-3xl border bg-card">
              <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold">Bot activity</h3>
                  <p className="text-xs text-muted-foreground">
                    Engagement signals each bot generated during this period.
                  </p>
                </div>
                <Badge variant="secondary">
                  {rollup.rows.length} {rollup.rows.length === 1 ? 'bot' : 'bots'}
                </Badge>
              </div>
              <div className="min-w-0 p-5">
                {rollup.activeBots > 0 ? (
                  <OrgBotComparisonChart data={rollup.comparisonData} />
                ) : (
                  <div className="flex min-h-48 items-center justify-center rounded-lg bg-muted/40 px-6 text-center text-sm text-muted-foreground">
                    No tracked activity in this period yet.
                  </div>
                )}
              </div>
            </Reveal>

            {/* Conversion snapshot — compact hairline grid. */}
            <Reveal delay={0.44} className="overflow-hidden rounded-3xl border bg-card">
              <div className="border-b px-5 py-4">
                <h3 className="text-sm font-semibold">Conversion snapshot</h3>
                <p className="text-xs text-muted-foreground">
                  How activity moved through the key outcomes.
                </p>
              </div>
              <div className="grid gap-px bg-border sm:grid-cols-3">
                <RateTile
                  label="Chat start rate"
                  value={rollup.chatStartRate}
                  detail={`${rollup.totals.conversations} of ${rollup.totals.widgetOpens} opens`}
                />
                <RateTile
                  label="Lead capture rate"
                  value={rollup.leadCaptureRate}
                  detail={`${rollup.totals.leads} of ${rollup.totals.conversations} conversations`}
                />
                <RateTile
                  label="After-hours share"
                  value={rollup.afterHoursRate}
                  detail={`${rollup.totals.afterHours} conversations outside working hours`}
                />
              </div>
            </Reveal>
          </section>
        )}
      </div>

      {/* Plan rail + add-on spotlight: arrive last, sliding in from the right. */}
      {planInfo && rail && (
        <div className="space-y-4 xl:sticky xl:top-6">
          <Reveal from="right" delay={0.55} duration={0.65}>
            <aside className="overflow-hidden rounded-3xl border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rail.image}
                alt=""
                aria-hidden="true"
                className="pointer-events-none mx-auto h-48 w-auto select-none pt-3"
              />
              <div className="space-y-4 px-6 pb-6 pt-3">
                <div>
                  <p className="text-sm font-semibold">{rail.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{rail.pitch}</p>
                </div>
                {Number.isFinite(planInfo.limit) && (
                  <div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Conversations this month</span>
                      <span className="font-medium tabular-nums">
                        {planInfo.used.toLocaleString()} / {planInfo.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.round((100 * planInfo.used) / planInfo.limit))}%` }}
                      />
                    </div>
                  </div>
                )}
                <Link
                  href="/app/subscription"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/85 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {rail.cta}
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>
            </aside>
          </Reveal>

          {/* Rotating add-on spotlight — a different one each visit. */}
          <Reveal from="right" delay={0.72} duration={0.65}>
            <aside className="overflow-hidden rounded-3xl border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={spotlight.image}
                alt=""
                aria-hidden="true"
                className="pointer-events-none mx-auto h-48 w-auto select-none pt-3"
              />
              <div className="space-y-2 px-6 pb-5 pt-1">
                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  Add-on
                </span>
                <p className="text-sm font-semibold">{spotlight.title}</p>
                <p className="text-xs text-muted-foreground">{spotlight.copy}</p>
                <Link
                  href="/app/subscription"
                  className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary hover:underline"
                >
                  Explore add-ons
                  <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </aside>
          </Reveal>
        </div>
      )}
      </div>
      )}

    </div>
  )
}
