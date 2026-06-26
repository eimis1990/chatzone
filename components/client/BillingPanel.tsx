'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckIcon, ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Plan, BillingInterval, SubscriptionStatus } from '@/lib/types'

export interface BillingPlanOption {
  plan: Plan
  name: string
  monthly: number
  conversations: number
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
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Payment past due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
}

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
  const [pending, startTransition] = useTransition()

  const perMonth = (m: number) => (annual ? Math.round((m * 10) / 12) : m)

  const go = (result: { url?: string; error?: string }) => {
    if (result.url) {
      window.location.href = result.url
    } else {
      toast.error(result.error ?? 'Something went wrong.')
    }
  }

  const handleCheckout = (target: Plan) => {
    startTransition(async () => go(await startCheckout(target, annual ? 'year' : 'month')))
  }
  const handlePortal = () => {
    startTransition(async () => go(await openPortal()))
  }

  const periodLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className="space-y-5 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Plan &amp; billing</h2>
          <p className="text-sm text-muted-foreground">
            You&apos;re on the{' '}
            <span className="font-medium capitalize text-foreground">{plan}</span> plan
            {plan !== 'free' && ` · ${STATUS_LABEL[status]}`}.
            {cancelAtPeriodEnd && periodLabel && ` Cancels on ${periodLabel}.`}
            {!cancelAtPeriodEnd && periodLabel && status === 'active' &&
              ` Renews ${periodLabel}.`}
          </p>
        </div>
        {hasCustomer && (
          <Button variant="outline" size="sm" onClick={handlePortal} disabled={pending}>
            <ExternalLinkIcon className="size-3.5" />
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
          <div className="inline-flex items-center rounded-full border bg-muted/50 p-1 text-sm">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${!annual ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${annual ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              Annual <span className="text-primary">· save ~17%</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((p) => {
              const isCurrent = p.plan === plan
              return (
                <div
                  key={p.plan}
                  className={`flex flex-col rounded-xl border p-4 ${isCurrent ? 'border-primary ring-1 ring-primary' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <CheckIcon className="size-3" /> Current
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">€{perMonth(p.monthly)}</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.conversations.toLocaleString()} conversations / mo
                    {annual && ` · €${p.monthly * 10}/yr`}
                  </p>
                  <Button
                    className="mt-4"
                    size="sm"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={pending || isCurrent}
                    onClick={() => handleCheckout(p.plan)}
                  >
                    {isCurrent ? 'Current plan' : plan === 'free' ? 'Upgrade' : 'Switch'}
                  </Button>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
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
