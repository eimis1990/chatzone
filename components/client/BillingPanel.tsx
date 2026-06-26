'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckIcon, ExternalLinkIcon, Loader2Icon, MicIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  voiceActive,
  voiceConfigured,
  voice,
  plans,
  selectPlan,
  setVoice,
  openPortal,
}: BillingPanelProps) {
  const router = useRouter()
  const [annual, setAnnual] = useState(interval !== 'month')
  const [busy, setBusy] = useState<string | null>(null)
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

      {!billingEnabled ? (
        <p className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Billing isn&apos;t switched on yet — plans will be purchasable here shortly.
        </p>
      ) : (
        <>
          {/* Billing period toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center rounded-full border bg-muted/50 p-1 text-sm">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${!annual ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${annual ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
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
                  className={`relative flex flex-col rounded-2xl border p-6 ${p.popular ? 'border-primary ring-1 ring-primary' : ''}`}
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
                    {p.monthly > 0 && annual ? `billed annually · €${p.monthly * 10}/yr` : ' '}
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

          {/* Voice add-on */}
          {voiceConfigured && (
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MicIcon className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{voice.name}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Add-on
                      </span>
                      {voiceActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <CheckIcon className="size-3" /> Active
                        </span>
                      )}
                    </div>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">{voice.blurb}</p>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {voice.features.map((f) => (
                        <li key={f} className="flex items-center gap-1">
                          <CheckIcon className="size-3 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="text-right">
                    <span className="text-2xl font-bold">€{voice.monthly}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  {voiceActive ? (
                    <Button variant="outline" disabled={anyBusy} onClick={() => runVoice(false)}>
                      {busy === 'voice' && <Loader2Icon className="size-4 animate-spin" />}
                      Remove
                    </Button>
                  ) : (
                    <Button disabled={anyBusy || !isPaying} onClick={() => runVoice(true)}>
                      {busy === 'voice' && <Loader2Icon className="size-4 animate-spin" />}
                      Add voice agent
                    </Button>
                  )}
                  {!isPaying && !voiceActive && (
                    <p className="text-xs text-muted-foreground">Available with any paid plan</p>
                  )}
                </div>
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
    </div>
  )
}
