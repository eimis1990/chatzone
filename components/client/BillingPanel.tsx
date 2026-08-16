'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckIcon,
  ExternalLinkIcon,
  Loader2Icon,
  Clock3Icon,
  MinusIcon,
  PlusIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Plan, BillingInterval, SubscriptionStatus } from '@/lib/types'

export interface BillingPlanOption {
  plan: Plan
  name: string
  monthly: number
  conversations: number
  blurb: string
  features: string[]
  purchasable: boolean
  popular: boolean
}

interface BillingPanelProps {
  billingEnabled: boolean
  plan: Plan
  status: SubscriptionStatus
  interval: BillingInterval | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasCustomer: boolean
  isPaying: boolean
  usage: {
    conversationsUsed: number
    conversationsLimit: number
    botsUsed: number
    botsLimit: number
    /** Voice add-on metering (rows render only while the add-on is active). */
    voiceMinutesUsed?: number
    voiceMinutesIncluded?: number
    /** € per extra minute beyond the included pool. */
    voiceOverageRate?: number
    previewMinutesUsed?: number
    previewMinutesIncluded?: number
  }
  voiceActive: boolean
  voiceConfigured: boolean
  voice: { name: string; monthly: number; blurb: string; features: string[] }
  visualizerActive: boolean
  visualizerConfigured: boolean
  visualizer: { name: string; monthly: number; blurb: string; features: string[] }
  plans: BillingPlanOption[]
  selectPlan: (
    plan: Plan,
    interval: BillingInterval,
  ) => Promise<{ url?: string; ok?: boolean; error?: string }>
  setVoice: (enabled: boolean) => Promise<{ ok?: boolean; error?: string }>
  setVisualizer: (enabled: boolean) => Promise<{ ok?: boolean; error?: string }>
  openPortal: () => Promise<{ url?: string; error?: string }>
  setupPackages?: {
    id: 'essential' | 'ecommerce'
    name: string
    price: number
    blurb: string
    features: string[]
  }[]
  purchasedSetups?: string[]
  buySetup?: (pkg: 'essential' | 'ecommerce') => Promise<{ url?: string; error?: string }>
}

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  inactive: 'No active subscription',
  trialing: 'Trial',
  active: 'Active',
  past_due: 'Payment past due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
}

const ORDER: Plan[] = ['free', 'starter', 'growth', 'scale', 'enterprise']

/** Doodle-fox art per plan tier (same set as Home's plan rail). */
const PLAN_ART: Partial<Record<Plan, string>> = {
  free: '/onboarding-fox-doodle.webp',
  starter: '/plans/fox-plan-starter.webp',
  growth: '/plans/fox-plan-growth.webp',
  scale: '/plans/fox-plan-scale.webp',
}

type AddOnStatus = 'active' | 'available' | 'coming'

function AddOnCard({
  image,
  title,
  description,
  price,
  priceSuffix,
  priceNote,
  features,
  status,
  action,
  helper,
}: {
  /** Doodle-fox illustration shown at the top of the card. */
  image: string
  title: string
  description: string
  price: string
  priceSuffix: string
  priceNote?: string
  features: readonly string[]
  status: AddOnStatus
  action: ReactNode
  helper: string
}) {
  const coming = status === 'coming'
  const active = status === 'active'

  // Coming-soon cards look exactly like the rest — only the badge and the
  // disabled button differ.
  return (
    <Card className="relative h-full rounded-3xl border ring-0 [--card-spacing:--spacing(5)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="pointer-events-none mx-auto h-32 w-auto select-none pt-3"
      />
      <CardHeader>
        <CardTitle>
          <h3>{title}</h3>
        </CardTitle>
        <CardDescription className="pt-1.5 leading-relaxed">{description}</CardDescription>
        <CardAction>
          <Badge variant={active ? 'default' : coming ? 'secondary' : 'outline'}>
            {active && <CheckIcon data-icon="inline-start" aria-hidden="true" />}
            {active ? 'Active' : coming ? 'Coming soon' : 'Available'}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <div>
          <p className="flex flex-wrap items-baseline gap-x-1 tabular-nums">
            <span className="text-3xl font-bold tracking-tight">{price}</span>
            <span className="text-sm text-muted-foreground">{priceSuffix}</span>
          </p>
          {priceNote && <p className="mt-1 text-xs text-muted-foreground">{priceNote}</p>}
        </div>

        <ul className="flex flex-col gap-2.5 text-sm text-foreground/80">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="mt-auto flex-col items-stretch gap-2">
        {action}
        <p className="min-h-4 text-center text-xs text-muted-foreground">{helper}</p>
      </CardFooter>
    </Card>
  )
}

export function BillingPanel({
  billingEnabled,
  plan,
  status,
  interval,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  hasCustomer,
  isPaying,
  usage,
  voiceActive,
  voiceConfigured,
  voice,
  visualizerActive,
  visualizerConfigured,
  visualizer,
  plans,
  selectPlan,
  setVoice,
  setVisualizer,
  openPortal,
  setupPackages = [],
  purchasedSetups = [],
  buySetup,
}: BillingPanelProps) {
  const router = useRouter()
  const [annual, setAnnual] = useState(interval !== 'month')
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmVoice, setConfirmVoice] = useState(false)
  const [confirmVisualizer, setConfirmVisualizer] = useState(false)
  const [, startTransition] = useTransition()

  const perMonth = (m: number) => (annual ? Math.round((m * 10) / 12) : m)
  const selectedInterval: BillingInterval = annual ? 'year' : 'month'
  const currentRank = ORDER.indexOf(plan)

  /** Handle a {url|ok|error} action result. */
  const resolve = (result: { url?: string; ok?: boolean; error?: string }, okMsg: string) => {
    if (result.url) {
      window.location.href = result.url
    } else if (result.ok) {
      toast.success(okMsg)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  const runPlan = (p: BillingPlanOption, label: string) => {
    setBusy(p.plan)
    startTransition(async () => {
      try {
        resolve(await selectPlan(p.plan, selectedInterval), `Switched to ${p.name}.`)
      } finally {
        setBusy(null)
      }
    })
  }

  const runPortal = (tag: string) => {
    setBusy(tag)
    startTransition(async () => {
      try {
        const r = await openPortal()
        if (r.url) window.location.href = r.url
        else toast.error(r.error ?? 'Could not open billing portal.')
      } finally {
        setBusy(null)
      }
    })
  }

  const runVoice = (enabled: boolean) => {
    setBusy('voice')
    startTransition(async () => {
      try {
        resolve(
          await setVoice(enabled),
          enabled ? 'Voice agent added.' : 'Voice agent removed.',
        )
      } finally {
        setBusy(null)
      }
    })
  }

  const runVisualizer = (enabled: boolean) => {
    setBusy('visualizer')
    startTransition(async () => {
      try {
        resolve(
          await setVisualizer(enabled),
          enabled ? 'Product visualizer added.' : 'Product visualizer removed.',
        )
      } finally {
        setBusy(null)
      }
    })
  }

  const runSetup = (pkg: 'essential' | 'ecommerce') => {
    if (!buySetup) return
    setBusy(`setup-${pkg}`)
    startTransition(async () => {
      try {
        const r = await buySetup(pkg)
        if (r.url) window.location.href = r.url
        else toast.error(r.error ?? 'Could not start checkout.')
      } finally {
        setBusy(null)
      }
    })
  }

  /** Thin usage progress bar — dark fill, calm even at 100%. */
  const UsageProgress = ({ used, limit }: { used: number; limit: number }) => (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-[#101213] transition-all duration-300"
        style={{ width: `${limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0}%` }}
      />
    </div>
  )

  const anyBusy = busy !== null
  const periodLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className="space-y-8">
      {/* Plan + usage — plan panel left, usage rows middle, the tier's fox right */}
      <section className="w-full rounded-3xl border bg-card p-6 sm:p-7">
        <div className="grid gap-7 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8">
          {/* Plan — the tier's own fox (same art as its card below) in the corner */}
          <aside className="flex flex-col rounded-3xl border bg-card p-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Your plan</p>
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-3xl font-semibold capitalize tracking-tight">{plan}</h2>
                    {isPaying && (
                      <span className="rounded-full border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        {STATUS_LABEL[status]}
                      </span>
                    )}
                  </div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PLAN_ART[plan] ?? PLAN_ART.scale}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none -mr-3 -mt-3 h-24 w-auto shrink-0 select-none"
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {plans.find((p) => p.plan === plan)?.blurb ?? 'Your current Loqara plan.'}
              </p>
              {isPaying && (interval || voiceActive) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {interval ? `Billed ${interval === 'year' ? 'annually' : 'monthly'}` : ''}
                  {voiceActive ? `${interval ? ' · ' : ''}Voice add-on` : ''}
                </p>
              )}
            </div>

            <div className="mt-8 lg:mt-auto">
              {hasCustomer ? (
                <Button
                  className="h-11 w-full rounded-xl bg-[#101213] font-semibold text-white hover:bg-[#101213]/90"
                  onClick={() => runPortal('portal')}
                  disabled={anyBusy}
                >
                  {busy === 'portal' ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <ExternalLinkIcon className="size-4" />
                  )}
                  Manage billing
                </Button>
              ) : (
                // scrollIntoView, not a hash link — the app shell scrolls a nested
                // container, where plain anchor jumps silently do nothing.
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#101213] text-sm font-semibold text-white transition-colors hover:bg-[#101213]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Upgrade plan
                </button>
              )}
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {periodLabel && (status === 'active' || status === 'trialing')
                  ? cancelAtPeriodEnd
                    ? `Cancels on ${periodLabel}`
                    : `Renews ${periodLabel}`
                  : 'Usage resets on the 1st'}
              </p>
            </div>
          </aside>

          {/* Usage */}
          <div className="min-w-0">
            <div>
              <h3 className="text-base font-semibold">Usage this month</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A quick overview of the resources included in your current plan.
              </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl bg-muted/50">
              {/* Conversations */}
              <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">Conversations</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Customer chat sessions used during this billing period.
                  </p>
                </div>
                <div className="w-full md:max-w-[300px]">
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold tabular-nums">
                      {usage.conversationsUsed.toLocaleString()} used
                    </span>
                    <span className="text-muted-foreground">
                      {isFinite(usage.conversationsLimit)
                        ? `${usage.conversationsLimit.toLocaleString()} included`
                        : 'Unlimited'}
                    </span>
                  </div>
                  {isFinite(usage.conversationsLimit) && (
                    <UsageProgress
                      used={usage.conversationsUsed}
                      limit={usage.conversationsLimit}
                    />
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Bots */}
              <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/5">
                    <svg viewBox="0 0 64 64" className="h-9 w-9" fill="none" aria-hidden="true">
                      <rect x="13" y="16" width="38" height="31" rx="13" fill="white" stroke="#18181B" strokeWidth="2" />
                      <rect x="20" y="23" width="24" height="15" rx="7.5" fill="#DFF4F6" stroke="#18181B" strokeWidth="2" />
                      <circle cx="27" cy="31" r="1.8" fill="#18181B" />
                      <circle cx="37" cy="31" r="1.8" fill="#18181B" />
                      <path d="M28 36c2 1.5 6 1.5 8 0" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
                      <path d="M32 11v5" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="32" cy="9" r="2.5" fill="#E97634" stroke="#18181B" strokeWidth="1.6" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium">Bot slots</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Assistants you can keep active at the same time.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:justify-end">
                  <span className="text-sm font-semibold tabular-nums">
                    {isFinite(usage.botsLimit)
                      ? `${usage.botsUsed} of ${usage.botsLimit} used`
                      : `${usage.botsUsed} active · Unlimited`}
                  </span>
                  {isFinite(usage.botsLimit) && usage.botsUsed >= usage.botsLimit && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      At limit
                    </span>
                  )}
                </div>
              </div>

              {/* Voice minutes — only while the Voice add-on is active */}
              {voiceActive && usage.voiceMinutesIncluded != null && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">Voice minutes</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(usage.voiceMinutesUsed ?? 0) > usage.voiceMinutesIncluded ? (
                          <>
                            +{(usage.voiceMinutesUsed ?? 0) - usage.voiceMinutesIncluded} extra min ·{' '}
                            €
                            {(
                              ((usage.voiceMinutesUsed ?? 0) - usage.voiceMinutesIncluded) *
                              (usage.voiceOverageRate ?? 0.2)
                            ).toFixed(2)}{' '}
                            so far this month
                          </>
                        ) : (
                          <>Live customer calls this month — extra minutes are €0.20 / min.</>
                        )}
                      </p>
                    </div>
                    <div className="w-full md:max-w-[300px]">
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold tabular-nums">
                          {(usage.voiceMinutesUsed ?? 0).toLocaleString()} used
                        </span>
                        <span className="text-muted-foreground">
                          {usage.voiceMinutesIncluded.toLocaleString()} included
                        </span>
                      </div>
                      <UsageProgress
                        used={usage.voiceMinutesUsed ?? 0}
                        limit={usage.voiceMinutesIncluded}
                      />
                    </div>
                  </div>

                  <div className="h-px bg-border" />
                  <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">Test call minutes</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Free preview calls in the bot configurator.
                      </p>
                    </div>
                    <div className="w-full md:max-w-[300px]">
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold tabular-nums">
                          {(usage.previewMinutesUsed ?? 0).toLocaleString()} used
                        </span>
                        <span className="text-muted-foreground">
                          {(usage.previewMinutesIncluded ?? 0).toLocaleString()} included
                        </span>
                      </div>
                      <UsageProgress
                        used={usage.previewMinutesUsed ?? 0}
                        limit={usage.previewMinutesIncluded ?? 0}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </section>

      {!billingEnabled ? (
        <p className="rounded-3xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Billing isn&apos;t switched on yet — plans will be purchasable here shortly.
        </p>
      ) : (
        <>
          {/* Billing period toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center rounded-full border bg-card p-1 text-sm shadow-sm">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${!annual ? 'bg-[#101213] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${annual ? 'bg-[#101213] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Annual <span className="text-primary">· 2 months free</span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div id="plans" className="grid scroll-mt-6 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => {
              const samePlan = p.plan === plan
              const isFree = p.plan === 'free'
              const isCurrent = isFree
                ? plan === 'free'
                : samePlan && isPaying && interval === selectedInterval
              const rank = ORDER.indexOf(p.plan)

              let label = 'Upgrade'
              let action: 'plan' | 'portal' | null = 'plan'
              if (isCurrent) {
                label = 'Current plan'
                action = null
              } else if (isFree) {
                // Reads as "move down to the free tier", not "cancel the product".
                label = 'Downgrade to Free'
                action = 'portal'
              } else if (samePlan) {
                label = `Switch to ${annual ? 'annual' : 'monthly'}`
              } else if (rank < currentRank) {
                label = 'Downgrade'
              }

              const thisBusy = busy === p.plan
              return (
                <div
                  key={p.plan}
                  className={`relative flex flex-col rounded-3xl border bg-card p-6 ${p.popular ? 'border-primary ring-1 ring-primary' : ''}`}
                >
                  {p.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Most popular
                    </span>
                  )}
                  {PLAN_ART[p.plan] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={PLAN_ART[p.plan]}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none mx-auto -mt-1 mb-2 h-28 w-auto select-none"
                    />
                  )}
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">€{perMonth(p.monthly)}</span>
                    {p.monthly > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                  </div>
                  <p className="mt-1 h-4 text-xs text-muted-foreground">
                    {p.monthly > 0 ? (annual ? `billed annually · €${p.monthly * 10}/yr` : 'billed monthly') : ' '}
                  </p>

                  <p className="mt-3 text-sm font-medium text-primary">
                    {p.conversations.toLocaleString()} conversations / mo
                  </p>

                  <Button
                    className="mt-5 h-11 w-full rounded-xl"
                    // Downgrades (and the free tier) stay quiet — accent is for
                    // the upgrade path only.
                    variant={action === 'portal' || rank < currentRank ? 'outline' : 'default'}
                    disabled={anyBusy || action === null}
                    onClick={() => (action === 'portal' ? runPortal(p.plan) : runPlan(p, label))}
                  >
                    {thisBusy && <Loader2Icon className="size-4 animate-spin" />}
                    {label}
                  </Button>

                  <ul className="mt-6 space-y-2.5 text-sm text-foreground/80">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 size-4 flex-shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* Add-ons */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold">Add-ons</h2>
              <p className="text-sm text-muted-foreground">
                Extend any paid plan. Add-ons are billed on the same subscription.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {/* Voice agent — interactive */}
              <AddOnCard
                image="/addons/fox-addon-voice.webp"
                title={voice.name}
                description={voice.blurb}
                price={`€${voice.monthly}`}
                priceSuffix="/ month"
                priceNote="Then €0.20 per additional minute"
                features={voice.features}
                status={voiceConfigured ? (voiceActive ? 'active' : 'available') : 'coming'}
                helper={
                  voiceConfigured
                    ? voiceActive
                      ? 'Active on your current subscription'
                      : isPaying
                        ? 'Added instantly and prorated'
                        : 'Available with any paid plan'
                    : 'Planned for a future release'
                }
                action={
                  voiceConfigured ? (
                    voiceActive ? (
                      <Button
                        className="h-11 w-full rounded-xl"
                        size="lg"
                        variant="outline"
                        disabled={anyBusy}
                        aria-busy={busy === 'voice'}
                        onClick={() => runVoice(false)}
                      >
                        {busy === 'voice' ? (
                          <Loader2Icon
                            className="animate-spin"
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                        ) : (
                          <MinusIcon data-icon="inline-start" aria-hidden="true" />
                        )}
                        Remove add-on
                      </Button>
                    ) : (
                      <Button
                        className="h-11 w-full rounded-xl"
                        size="lg"
                        disabled={anyBusy || !isPaying}
                        aria-busy={busy === 'voice'}
                        onClick={() => setConfirmVoice(true)}
                      >
                        {busy === 'voice' ? (
                          <Loader2Icon
                            className="animate-spin"
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                        ) : (
                          <PlusIcon data-icon="inline-start" aria-hidden="true" />
                        )}
                        Add voice agent
                      </Button>
                    )
                  ) : (
                    <Button className="h-11 w-full rounded-xl" size="lg" variant="outline" disabled>
                      <Clock3Icon data-icon="inline-start" aria-hidden="true" />
                      Coming soon
                    </Button>
                  )
                }
              />

              {/* Product visualizer — interactive */}
              <AddOnCard
                image="/addons/fox-addon-visualizer.webp"
                title={visualizer.name}
                description={visualizer.blurb}
                price={`€${visualizer.monthly}`}
                priceSuffix="/ month"
                features={visualizer.features}
                status={
                  visualizerConfigured ? (visualizerActive ? 'active' : 'available') : 'coming'
                }
                helper={
                  visualizerConfigured
                    ? visualizerActive
                      ? 'Active on your current subscription'
                      : isPaying
                        ? 'Added instantly and prorated'
                        : 'Available with any paid plan'
                    : 'Planned for a future release'
                }
                action={
                  visualizerConfigured ? (
                    visualizerActive ? (
                      <Button
                        className="h-11 w-full rounded-xl"
                        size="lg"
                        variant="outline"
                        disabled={anyBusy}
                        aria-busy={busy === 'visualizer'}
                        onClick={() => runVisualizer(false)}
                      >
                        {busy === 'visualizer' ? (
                          <Loader2Icon
                            className="animate-spin"
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                        ) : (
                          <MinusIcon data-icon="inline-start" aria-hidden="true" />
                        )}
                        Remove add-on
                      </Button>
                    ) : (
                      <Button
                        className="h-11 w-full rounded-xl"
                        size="lg"
                        disabled={anyBusy || !isPaying}
                        aria-busy={busy === 'visualizer'}
                        onClick={() => setConfirmVisualizer(true)}
                      >
                        {busy === 'visualizer' ? (
                          <Loader2Icon
                            className="animate-spin"
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                        ) : (
                          <PlusIcon data-icon="inline-start" aria-hidden="true" />
                        )}
                        Add room visualizer
                      </Button>
                    )
                  ) : (
                    <Button className="h-11 w-full rounded-xl" size="lg" variant="outline" disabled>
                      <Clock3Icon data-icon="inline-start" aria-hidden="true" />
                      Coming soon
                    </Button>
                  )
                }
              />

              {/* Channels — coming soon */}
              <AddOnCard
                image="/addons/fox-addon-messenger.webp"
                title="Channels"
                description="Meet customers in the messaging apps they already use."
                price="€19"
                priceSuffix="/ month, per channel"
                features={[
                  'WhatsApp, Instagram & Messenger',
                  'Choose only the channels you need',
                  'No setup fee',
                ]}
                status="coming"
                helper="Planned for a future release"
                action={
                  <Button className="h-11 w-full rounded-xl" size="lg" variant="outline" disabled>
                    <Clock3Icon data-icon="inline-start" aria-hidden="true" />
                    Coming soon
                  </Button>
                }
              />

              {/* Extra conversations — coming soon */}
              <AddOnCard
                image="/addons/fox-addon-extra.webp"
                title="Extra conversations"
                description="Handle a busy month without moving to a higher plan."
                price="~€15"
                priceSuffix="/ 1,000 conversations"
                features={[
                  '1,000-conversation top-up',
                  'No plan tier change required',
                  'Use only when volume spikes',
                ]}
                status="coming"
                helper="Planned for a future release"
                action={
                  <Button className="h-11 w-full rounded-xl" size="lg" variant="outline" disabled>
                    <Clock3Icon data-icon="inline-start" aria-hidden="true" />
                    Coming soon
                  </Button>
                }
              />
            </div>
          </div>

          {/* Done-for-you setup (one-time) */}
          {setupPackages.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Done-for-you setup</h2>
                <p className="text-sm text-muted-foreground">
                  One-time — we train, configure and install your agent for you. Pay once.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {setupPackages.map((s) => {
                  const owned = purchasedSetups.includes(s.id)
                  const thisBusy = busy === `setup-${s.id}`
                  return (
                    <div key={s.id} className="relative flex flex-col rounded-3xl border bg-card p-6">
                      {owned && (
                        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                          <CheckIcon className="size-3.5" /> Paid
                        </span>
                      )}
                      <h3 className="font-semibold">{s.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{s.blurb}</p>
                      <p className="mt-3 text-2xl font-bold tracking-tight">
                        €{s.price.toLocaleString('en-US')}
                        <span className="text-sm font-normal text-muted-foreground"> one-time</span>
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-foreground/80">
                        {s.features.map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <CheckIcon className="mt-0.5 size-4 flex-shrink-0 text-primary" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="mt-5 h-11 w-full rounded-xl bg-[#101213] text-white hover:bg-[#101213]/90"
                        disabled={anyBusy || owned || !buySetup}
                        onClick={() => runSetup(s.id)}
                      >
                        {thisBusy && <Loader2Icon className="size-4 animate-spin" />}
                        {owned ? 'Purchased' : 'Get this setup'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Need higher volume or custom terms?{' '}
            <a href="mailto:hello@loqara.com" className="text-primary hover:underline">
              Talk to us about Enterprise
            </a>
            .
          </p>
        </>
      )}

      {/* Confirm adding the Product visualizer add-on (extra recurring charge). */}
      <Dialog open={confirmVisualizer} onOpenChange={setConfirmVisualizer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add the Product visualizer?</DialogTitle>
            <DialogDescription>
              This adds <span className="font-medium text-foreground">€{visualizer.monthly}/mo</span>{' '}
              to your subscription, prorated for the rest of the current billing period. It includes
              100 renders per month; you can remove it anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setConfirmVisualizer(false)} disabled={anyBusy}>
              Cancel
            </Button>
            <Button
              className="h-11 rounded-xl"
              onClick={() => {
                setConfirmVisualizer(false)
                runVisualizer(true)
              }}
              disabled={anyBusy}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm adding the Voice add-on (extra recurring charge). */}
      <Dialog open={confirmVoice} onOpenChange={setConfirmVoice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add the Voice agent?</DialogTitle>
            <DialogDescription>
              This adds <span className="font-medium text-foreground">€{voice.monthly}/mo</span> to your
              subscription (plus €0.20/min beyond the included minutes), prorated for the rest of the
              current billing period. You can remove it anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setConfirmVoice(false)} disabled={anyBusy}>
              Cancel
            </Button>
            <Button
              className="h-11 rounded-xl"
              onClick={() => {
                setConfirmVoice(false)
                runVoice(true)
              }}
              disabled={anyBusy}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
