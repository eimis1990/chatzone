'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckIcon, ExternalLinkIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Plan, BillingInterval, SubscriptionStatus } from '@/lib/types'

export interface BillingPlanOption {
  plan: Plan
  name: string
  monthly: number
  conversations: number
  blurb: string
  features: string[]
}

interface BillingPanelProps {
  /** Whether Stripe keys are configured on the server. */
  billingEnabled: boolean
  plan: Plan
  status: SubscriptionStatus
  interval: BillingInterval | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasCustomer: boolean
  plans: BillingPlanOption[]
  startCheckout: (
    plan: Plan,
    interval: BillingInterval,
  ) => Promise<{ url?: string; error?: string }>
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
  plans,
  startCheckout,
  openPortal,
}: BillingPanelProps) {
  const [annual, setAnnual] = useState(interval !== 'month')
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null)
  const [portalPending, setPortalPending] = useState(false)
  const [, startTransition] = useTransition()

  const perMonth = (m: number) => (annual ? Math.round((m * 10) / 12) : m)
  const currentRank = ORDER.indexOf(plan)

  const go = (result: { url?: string; error?: string }) => {
    if (result.url) {
      window.location.href = result.url
    } else {
      toast.error(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  const handleCheckout = (target: Plan) => {
    setPendingPlan(target)
    startTransition(async () => {
      try {
        go(await startCheckout(target, annual ? 'year' : 'month'))
      } finally {
        setPendingPlan(null)
      }
    })
  }

  const handlePortal = () => {
    setPortalPending(true)
    startTransition(async () => {
      try {
        go(await openPortal())
      } finally {
        setPortalPending(false)
      }
    })
  }

  const periodLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  const anyPending = pendingPlan !== null || portalPending

  return (
    <div className="space-y-6">
      {/* Current-plan banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-5">
        <div>
          <p className="text-sm text-muted-foreground">Current plan</p>
          <p className="text-xl font-semibold capitalize">
            {plan}
            {plan !== 'free' && (
              <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                {STATUS_LABEL[status]}
                {interval ? ` · billed ${interval === 'year' ? 'annually' : 'monthly'}` : ''}
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
          <Button variant="outline" onClick={handlePortal} disabled={anyPending}>
            {portalPending ? (
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

          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((p) => {
              const isCurrent = p.plan === plan
              const rank = ORDER.indexOf(p.plan)
              const isDowngrade = currentRank > rank
              const busy = pendingPlan === p.plan
              return (
                <div
                  key={p.plan}
                  className={`flex flex-col rounded-2xl border p-6 ${isCurrent ? 'border-primary ring-1 ring-primary' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <CheckIcon className="size-3" /> Current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">€{perMonth(p.monthly)}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-1 h-4 text-xs text-muted-foreground">
                    {annual ? `billed annually · €${p.monthly * 10}/yr` : ' '}
                  </p>

                  <p className="mt-3 text-sm font-medium text-primary">
                    {p.conversations.toLocaleString()} conversations / mo
                  </p>

                  <Button
                    className="mt-5"
                    variant={isCurrent || isDowngrade ? 'outline' : 'default'}
                    disabled={anyPending || isCurrent}
                    onClick={() => handleCheckout(p.plan)}
                  >
                    {busy && <Loader2Icon className="size-4 animate-spin" />}
                    {isCurrent ? 'Current plan' : isDowngrade ? 'Switch to this' : 'Upgrade'}
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
