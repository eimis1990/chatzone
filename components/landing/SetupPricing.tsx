import { CheckIcon } from 'lucide-react'
import { SETUP_PACKAGES } from '@/lib/setup-packages'
import { GetStartedDialog } from './GetStartedDialog'

/**
 * OPTIONAL one-time "done-for-you" setup packages. Positioned as concierge
 * convenience, never a requirement — the free guided onboarding is the default
 * path, and this section must not make self-serve look hard. Shows ONLY the
 * one-time fee so visitors understand they pay once and never repeat it.
 */
export function SetupPricing() {
  return (
    <section id="setup" className="scroll-mt-20 bg-[#101213] text-white">
      <div className="mx-auto max-w-5xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Optional concierge</p>
          <h2 className="mt-3 text-5xl font-light tracking-tight sm:text-6xl">Prefer it done for you?</h2>
          <p className="mt-4 text-lg text-white/70">
            Most businesses go live themselves in minutes — free, with our guided setup. Too busy?
            Our team trains, fine-tunes and installs your agent end to end.{' '}
            <span className="font-medium text-white/90">One-time fee, completely optional.</span>
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {SETUP_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7"
            >
              <h3 className="text-xl font-semibold">{pkg.name}</h3>
              <p className="mt-1 text-sm text-white/60">{pkg.blurb}</p>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">
                  €{pkg.price.toLocaleString('en-US')}
                </span>
                <span className="text-sm font-medium text-white/50">one-time</span>
              </div>
              <span className="mt-3 inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                {pkg.timeline}
              </span>

              <ul className="mt-6 space-y-3">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>

              <GetStartedDialog
                source="setup"
                label="Request setup"
                triggerClassName="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              />
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-white/50">
          A single one-time fee — no recurring setup charges, ever.
        </p>
      </div>
    </section>
  )
}
