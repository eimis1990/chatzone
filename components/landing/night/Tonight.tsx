import Link from 'next/link'
import { GetStartedDialog } from '../GetStartedDialog'
import { NightFox } from './NightFox'
import s from './night.module.css'

/**
 * The close: the day has run out and it is night again, and the fox is the one
 * staying up. Owns the `#get-started` hash, which must open the signup dialog
 * (blog CTAs and links in chat replies point at it) rather than scroll anywhere.
 * It also names the person who replies: the page's one human.
 */
export function Tonight() {
  return (
    <section className={s.tonight} data-clock="1607" data-tone="night">
      <div className={s.stars} aria-hidden="true">
        <i />
        <i />
      </div>
      <div className={s.tonightInner}>
        <h2 className={s.tonightTitle}>It will be 2:47 AM again tonight.</h2>
        <p className={`${s.sub} mx-auto max-w-xl`}>
          Send us your store&rsquo;s address. Within one working day you will be watching your own
          assistant answer on your own site.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <GetStartedDialog
            source="cta"
            shimmer
            openOnHash="#get-started"
            triggerClassName="relative inline-flex h-13 items-center justify-center overflow-hidden rounded-full bg-primary px-10 text-base font-semibold text-white shadow-[0_10px_40px_rgba(233,118,52,0.45)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
          <p className="text-sm text-white/60">
            Free, no card needed. The preview comes from{' '}
            <Link
              href="/about"
              prefetch={false}
              className="text-white/85 underline decoration-white/30 underline-offset-4 hover:text-white"
            >
              Eimantas Kudarauskas
            </Link>
            , Loqara&rsquo;s founder.
          </p>
        </div>
      </div>

      <div className={s.foxStage}>
        <div className={s.foxGlow} aria-hidden="true" />
        <div className={s.foxPool} aria-hidden="true" />
        <div className={s.foxShadow} aria-hidden="true" />
        <NightFox>
          <p className={`${s.foxSays} ${s.rise}`}>Go to bed. I&rsquo;ve got the store.</p>
        </NightFox>
      </div>
    </section>
  )
}
