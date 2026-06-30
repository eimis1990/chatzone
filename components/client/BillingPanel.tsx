'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PhoneCallIcon,
  MessageSquareIcon,
  ArrowUpRightIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  plans: BillingPlanOption[]
  selectPlan: (
    plan: Plan,
    interval: BillingInterval,
  ) => Promise<{ url?: string; ok?: boolean; error?: string }>
  setVoice: (enabled: boolean) => Promise<{ ok?: boolean; error?: string }>
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
  plans,
  selectPlan,
  setVoice,
  openPortal,
  setupPackages = [],
  purchasedSetups = [],
  buySetup,
}: BillingPanelProps) {
  const router = useRouter()
  const [annual, setAnnual] = useState(interval !== 'month')
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmVoice, setConfirmVoice] = useState(false)
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
      {/* Current-plan banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-5">
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

      {/* Usage this month */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold">Usage this month</h2>
        <p className="text-sm text-muted-foreground">Resets on the 1st.</p>
        <div className="mt-4 space-y-4">
          <Meter
            label="Conversations"
            used={usage.conversationsUsed}
            limit={usage.conversationsLimit}
          />
          <Meter label="Bots" used={usage.botsUsed} limit={usage.botsLimit} />
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
                Annual <span className="text-primary">· save ~17%</span>
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
                label = 'Cancel plan'
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
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Add-ons</h2>
              <p className="text-sm text-muted-foreground">
                Extend any paid plan. Add-ons are billed on the same subscription.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {/* Voice agent — interactive */}
              <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <PhoneCallIcon className="size-5" />
                  </span>
                  {voiceActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <CheckIcon className="size-3" /> Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Add-on
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{voice.name}</h3>
                <p className="mt-1 text-lg font-bold">
                  €{voice.monthly}
                  <span className="text-sm font-normal text-muted-foreground"> /mo + €0.20/min</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{voice.blurb}</p>

                {voiceConfigured ? (
                  voiceActive ? (
                    <Button
                      className="mt-4"
                      variant="outline"
                      disabled={anyBusy}
                      onClick={() => runVoice(false)}
                    >
                      {busy === 'voice' && <Loader2Icon className="size-4 animate-spin" />}
                      Remove
                    </Button>
                  ) : (
                    <Button
                      className="mt-4"
                      disabled={anyBusy || !isPaying}
                      onClick={() => setConfirmVoice(true)}
                    >
                      {busy === 'voice' && <Loader2Icon className="size-4 animate-spin" />}
                      Add voice agent
                    </Button>
                  )
                ) : (
                  <Button className="mt-4" variant="outline" disabled>
                    Coming soon
                  </Button>
                )}
                {voiceConfigured && !isPaying && !voiceActive && (
                  <p className="mt-1.5 text-xs text-muted-foreground">Available with any paid plan</p>
                )}
              </div>

              {/* Channels — coming soon */}
              <div className="flex flex-col rounded-2xl border border-dashed bg-card/60 p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <MessageSquareIcon className="size-5" />
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Coming soon
                  </span>
                </div>
                <h3 className="mt-3 font-semibold">Channels</h3>
                <p className="mt-1 text-lg font-bold">
                  €19<span className="text-sm font-normal text-muted-foreground"> /mo each</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  WhatsApp, Instagram &amp; Messenger — connect any channel with no setup fee.
                </p>
                <Button className="mt-4" variant="outline" disabled>
                  Coming soon
                </Button>
              </div>

              {/* Extra conversations — coming soon */}
              <div className="flex flex-col rounded-2xl border border-dashed bg-card/60 p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ArrowUpRightIcon className="size-5" />
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Coming soon
                  </span>
                </div>
                <h3 className="mt-3 font-semibold">Extra conversations</h3>
                <p className="mt-1 text-lg font-bold">
                  ~€15<span className="text-sm font-normal text-muted-foreground"> / 1,000</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Busy month? Top up any plan instead of jumping a tier.
                </p>
                <Button className="mt-4" variant="outline" disabled>
                  Coming soon
                </Button>
              </div>
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
                    <div key={s.id} className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{s.name}</h3>
                        {owned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <CheckIcon className="size-3" /> Purchased
                          </span>
                        )}
                      </div>
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
            <a href="mailto:e.kudarauskas@gmail.com" className="text-primary hover:underline">
              Talk to us about Enterprise
            </a>
            .
          </p>
        </>
      )}

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
