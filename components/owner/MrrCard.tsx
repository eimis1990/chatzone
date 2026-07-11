import { CoinsIcon } from 'lucide-react'
import { PLANS } from '@/lib/plans-catalog'
import type { MrrBreakdown } from '@/lib/billing/mrr'

const eur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

/**
 * Headline earnings card for the owner dashboard: current monthly recurring
 * revenue with ARR, paying-client count, and a per-plan breakdown. A dark accent
 * panel (`#101213` app-shell background) with the faint white grid fading in from
 * the right, matching the app shell. No time series yet — we don't store MRR
 * history (see docs/wiki/owner-dashboard.md), so this is the live snapshot only.
 */
export function MrrCard({ mrr, arr, payingClients, byPlan, voiceAddons }: MrrBreakdown) {
  const plans = Object.entries(byPlan) as [keyof typeof PLANS, number][]

  return (
    <div className="bg-sidebar-mesh shell-grid-right relative overflow-hidden rounded-xl border border-white/10 p-6 text-white">
      {/* Soft brand glow from the top-right corner. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary opacity-25 blur-3xl"
      />

      <div className="relative z-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/60">
            <CoinsIcon className="size-4 text-primary" aria-hidden="true" />
            Monthly recurring revenue
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums">
            {eur(mrr)}
            <span className="ml-1 text-lg font-medium text-white/50">/mo</span>
          </p>
          <p className="mt-1 text-sm text-white/60">
            {payingClients === 0
              ? 'No paying clients yet'
              : `${eur(arr)} ARR · ${payingClients} paying ${payingClients === 1 ? 'client' : 'clients'}`}
          </p>
        </div>

        {plans.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {plans.map(([plan, count]) => (
              <span
                key={plan}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/90"
              >
                {PLANS[plan].name}
                <span className="tabular-nums text-white/50">×{count}</span>
              </span>
            ))}
            {voiceAddons > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/90">
                Voice
                <span className="tabular-nums text-white/50">×{voiceAddons}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
