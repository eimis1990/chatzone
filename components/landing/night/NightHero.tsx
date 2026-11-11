import { GetStartedDialog } from '../GetStartedDialog'
import { BRAND_MARKS } from '../brand-marks'
import { HeroWindow } from './HeroWindow'
import { LiveChatButton } from './LiveChatButton'
import { NightSky } from './NightSky'
import s from './night.module.css'

const SECONDARY =
  'text-sm font-medium text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'

/**
 * The night landing's first moment: 2:47 AM, one lit window, one shopper being
 * answered. `data-clock` is the scene's time in minutes past midnight, read by
 * the nav clock (PageClock); `data-tone` tells the nav which bar to wear.
 *
 * `live` is whether Loqara's own widget is switched on for this page: when it
 * is, the second action opens it, because the real product is the best proof.
 */
export function NightHero({ live }: { live: boolean }) {
  return (
    <section className={s.hero} data-clock="167" data-tone="night">
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
            While you sleep, shoppers still ask. Loqara, the AI chat and voice agent for online
            stores, answers them from your own products and policies. Anything it can&rsquo;t
            answer is waiting in your inbox by morning.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <GetStartedDialog
              source="hero"
              shimmer
              triggerClassName="relative inline-flex h-13 items-center justify-center overflow-hidden rounded-full bg-primary px-8 text-base font-semibold text-white shadow-[0_10px_40px_rgba(233,118,52,0.45)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            />
            {live ? (
              <LiveChatButton location="hero" className={SECONDARY}>
                Or chat with it right now
              </LiveChatButton>
            ) : (
              <a href="#features" className={SECONDARY}>
                See how the night goes
              </a>
            )}
          </div>
          <p className="mt-4 text-sm text-white/60">
            Free, no card needed. Your preview arrives within one working day.
          </p>
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
