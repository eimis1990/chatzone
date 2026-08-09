import { CoinsIcon } from 'lucide-react'
import type { MrrBreakdown } from '@/lib/billing/mrr'

const eur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

/**
 * Headline earnings strip for the owner dashboard: current monthly recurring
 * revenue with ARR, paying-client, and per-client mini-stats. Renders flat
 * (no border/radius) — the dashboard embeds it as the dark header of the
 * combined stats panel. No time series yet — we don't store MRR history
 * (see docs/wiki/owner-dashboard.md), so this is the live snapshot.
 */
export function MrrCard({ mrr, arr, payingClients }: MrrBreakdown) {
  const miniStats = [
    { label: 'ARR', value: eur(arr) },
    { label: 'Paying clients', value: String(payingClients) },
    { label: 'Avg / client', value: eur(payingClients > 0 ? mrr / payingClients : 0) },
  ]

  return (
    <div className="bg-sidebar-mesh relative overflow-hidden p-6 text-white">
      {/* Recurring-revenue fox (dark-canvas render); the radial mask feathers
          its edges into the panel so the near-identical backgrounds fuse. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/plans/fox-mrr-dark.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 right-2 hidden h-56 w-auto select-none [mask-image:radial-gradient(closest-side,black_65%,transparent_100%)] md:block"
      />

      <div className="relative z-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 md:pr-52">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/60">
            <CoinsIcon className="size-4 text-primary" aria-hidden="true" />
            Monthly recurring revenue
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums">
            {eur(mrr)}
            <span className="ml-1 text-lg font-medium text-white/50">/mo</span>
          </p>
        </div>

        {/* Secondary revenue facts fill the middle of the strip. Equal-width
            columns: the widest label ("Paying clients") sets the track size. */}
        <div className="grid auto-cols-fr grid-flow-col gap-2">
          {miniStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5"
            >
              <p className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-white/50">
                {stat.label}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
