import { GetStartedDialog } from '../GetStartedDialog'
import s from './night.module.css'

/**
 * The close: the day has run out and it is night again. Owns the
 * `#get-started` hash, which must open the signup dialog (blog CTAs and links
 * in chat replies point at it) rather than scroll anywhere.
 */
export function Tonight() {
  return (
    <section className={s.tonight} data-clock="1607" data-tone="night">
      <div className={s.stars} aria-hidden="true" />
      <div className={s.tonightInner}>
        <h2 className={s.tonightTitle}>It will be 2:47 AM again tonight.</h2>
        <p className={`${s.sub} mx-auto max-w-xl`}>
          Have your store answering by then. Free to start, and live with one line of code.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <GetStartedDialog
            source="cta"
            shimmer
            openOnHash="#get-started"
            triggerClassName="relative inline-flex h-13 items-center justify-center overflow-hidden rounded-full bg-primary px-11 text-base font-semibold text-white shadow-[0_10px_40px_rgba(233,118,52,0.45)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
          <p className="text-sm text-white/50">No credit card needed. We reach out within a day.</p>
        </div>
      </div>
      <div className={s.horizon} aria-hidden="true" />
      <div className={s.beaconSpill} aria-hidden="true" />
      <div className={s.beacon} aria-hidden="true" />
    </section>
  )
}
