'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PhoneCallIcon,
  MessageSquareIcon,
  ArrowUpRightIcon,
  Clock3Icon,
  MinusIcon,
  PlusIcon,
  SofaIcon,
  type LucideIcon,
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

type AddOnStatus = 'active' | 'available' | 'coming'

function AddOnCard({
  icon: Icon,
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
  icon: LucideIcon
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

  return (
    <Card
      className={cn(
        'relative h-full shadow-sm [--card-spacing:--spacing(5)]',
        coming && 'bg-muted/20 shadow-none',
      )}
    >
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-1 bg-primary',
          coming && 'bg-muted-foreground/20',
        )}
        aria-hidden="true"
      />
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary',
              coming && 'bg-muted text-muted-foreground',
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <h3>{title}</h3>
        </CardTitle>
        <CardDescription className="pt-2 leading-relaxed">{description}</CardDescription>
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
              <CheckIcon
                className={cn(
                  'mt-0.5 size-4 shrink-0 text-primary',
                  coming && 'text-muted-foreground',
                )}
                aria-hidden="true"
              />
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

  const Meter = ({ label, used, limit }: { label: string; used: number; limit: number }) => {
    const unlimited = !isFinite(limit)
    const pct = unlimited || limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
    const over = !unlimited && used >= limit
    const near = !unlimited && !over && pct >= 90
    const barColor = over ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-primary'
    return (
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">
            {used.toLocaleString()}
            {unlimited ? ' · Unlimited' : ` / ${limit.toLocaleString()}`}
          </span>
        </div>
        {!unlimited && (
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${barColor} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {over && <p className="mt-1 text-xs text-red-600">Limit reached — upgrade to add more.</p>}
        {near && (
          <p className="mt-1 text-xs text-amber-600">
            {(limit - used).toLocaleString()} left this month.
          </p>
        )}
      </div>
    )
  }

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
      {/* Plan + usage — one compact card (they belong together) */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-xl font-semibold capitalize">
              {plan}
              {isPaying && (
                <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                  {STATUS_LABEL[status]}
                  {interval ? ` · billed ${interval === 'year' ? 'annually' : 'monthly'}` : ''}
                  {voiceActive ? ' · Voice add-on' : ''}
                </span>
              )}
            </p>
            {periodLabel && (status === 'active' || status === 'trialing') && (
              <p className="mt-1 text-xs text-muted-foreground">
                {cancelAtPeriodEnd ? `Cancels on ${periodLabel}.` : `Renews ${periodLabel}.`}
              </p>
            )}
          </div>
          {hasCustomer && (
            <Button variant="outline" onClick={() => runPortal('portal')} disabled={anyBusy}>
              {busy === 'portal' ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ExternalLinkIcon className="size-4" />
              )}
              Manage billing
            </Button>
          )}
        </div>

        <div className="mt-5 border-t pt-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Usage this month</h2>
            <span className="text-xs text-muted-foreground">Resets on the 1st</span>
          </div>
          <div className="mt-4 space-y-4">
            <Meter
              label="Conversations"
              used={usage.conversationsUsed}
              limit={usage.conversationsLimit}
            />
            <Meter label="Bots" used={usage.botsUsed} limit={usage.botsLimit} />
          </div>
        </div>
      </div>

      {!billingEnabled ? (
        <p className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
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
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${!annual ? 'bg-muted shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${annual ? 'bg-muted shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Annual <span className="text-primary">· 2 months free</span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
                  className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm ${p.popular ? 'border-primary ring-1 ring-primary' : ''}`}
                >
                  {p.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Most popular
                    </span>
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
                    className="mt-5"
                    variant={isCurrent || action === 'portal' || rank < currentRank ? 'outline' : 'default'}
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
                icon={PhoneCallIcon}
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
                        className="h-11 w-full"
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
                        className="h-11 w-full"
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
                    <Button className="h-11 w-full" size="lg" variant="outline" disabled>
                      <Clock3Icon data-icon="inline-start" aria-hidden="true" />
                      Coming soon
                    </Button>
                  )
                }
              />

              {/* Product visualizer — interactive */}
              <AddOnCard
                icon={SofaIcon}
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
                        className="h-11 w-full"
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
                        className="h-11 w-full"
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
                    <Button className="h-11 w-full" size="lg" variant="outline" disabled>
                      <Clock3Icon data-icon="inline-start" aria-hidden="true" />
                      Coming soon
                    </Button>
                  )
                }
              />

              {/* Channels — coming soon */}
              <AddOnCard
                icon={MessageSquareIcon}
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
                  <Button className="h-11 w-full" size="lg" variant="outline" disabled>
                    <Clock3Icon data-icon="inline-start" aria-hidden="true" />
                    Coming soon
                  </Button>
                }
              />

              {/* Extra conversations — coming soon */}
              <AddOnCard
                icon={ArrowUpRightIcon}
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
                  <Button className="h-11 w-full" size="lg" variant="outline" disabled>
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
                    <div key={s.id} className="relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
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
                        className="mt-5"
                        variant={owned ? 'outline' : 'default'}
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
            <Button variant="outline" onClick={() => setConfirmVisualizer(false)} disabled={anyBusy}>
              Cancel
            </Button>
            <Button
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
            <Button variant="outline" onClick={() => setConfirmVoice(false)} disabled={anyBusy}>
              Cancel
            </Button>
            <Button
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
