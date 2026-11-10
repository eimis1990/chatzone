import { GetStartedDialog } from '../GetStartedDialog'
import { BRAND_MARKS } from '../brand-marks'
import { display } from './fonts'
import { HeroWindow } from './HeroWindow'
import { NightSky } from './NightSky'
import s from './night.module.css'

/**
 * The night landing's first moment: 02:47, one lit window, one shopper being
 * answered. `data-night` is the scene's time in minutes past midnight, read by
 * the scroll clock (NightClock).
 */
export function NightHero() {
  return (
    <section className={`${s.hero} ${display.variable}`} data-night="167">
      <div className={s.skyWrap} aria-hidden="true">
        <NightSky />
      </div>
      <div className={s.ground} aria-hidden="true" />

      <div className={s.heroGrid}>
        <div className={s.heroCopy}>
          <h1 className={s.title}>
            <span className={s.titleLine}>It&rsquo;s 2:47 AM.</span> Your store just answered.
          </h1>
          <p className={s.lede}>
            Loqara is the AI chat and voice agent for online stores. It answers shoppers from your
            own products and policies at any hour, and brings in your team when a person is needed.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <GetStartedDialog
              source="hero"
              shimmer
              triggerClassName="relative inline-flex h-13 items-center justify-center overflow-hidden rounded-full bg-primary px-9 text-base font-semibold text-white shadow-[0_10px_40px_rgba(233,118,52,0.45)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            />
            <a
              href="#night"
              className="text-sm font-medium text-white/75 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white/70"
            >
              See the rest of the night
            </a>
          </div>
          <p className="mt-4 text-sm text-white/50">Free to start. No credit card needed.</p>
        </div>

        <HeroWindow />
      </div>

      <div className={s.platforms}>
        <p className={s.platformsText}>
          Works with<span> Shopify, WooCommerce, Magento, WordPress and more</span>
        </p>
        <ul aria-label="Platforms Loqara works with">
          {BRAND_MARKS.map((b) => (
            <li key={b.name}>
              <svg
                viewBox={b.viewBox ?? '0 0 24 24'}
                role={b.wordmark ? 'img' : undefined}
                aria-label={b.wordmark ? b.name : undefined}
                aria-hidden={b.wordmark ? undefined : true}
                className={`${b.wordmark ? 'h-4 w-auto' : 'size-5'} shrink-0 fill-current`}
              >
                <path d={b.path} />
              </svg>
              {!b.wordmark && b.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
