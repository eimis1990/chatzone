import { Plus_Jakarta_Sans } from 'next/font/google'
import { GetStartedDialog } from './GetStartedDialog'
import { HeroConversation } from './HeroConversation'
import { HeroFoxMedia } from './HeroFoxMedia'
import { BRAND_MARKS, type BrandMark } from './brand-marks'

const heroFont = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' })

export function Hero() {
  return (
    <section className="landing-hero relative flex h-svh min-h-[40rem] flex-col overflow-hidden bg-[#fbfbfa] text-[#101213]">
      <div className="landing-hero-copy relative z-10 mx-auto flex w-full max-w-7xl shrink-0 flex-col items-center px-5 text-center">
        <div className="flex max-w-5xl flex-col items-center">
          <h1 className={`${heroFont.className} landing-hero-title text-balance font-extrabold leading-[1.04] tracking-[-0.055em]`}>
            Let your customers
            <br />
            <span className="text-primary">talk to your store.</span>
          </h1>

          <p className="landing-hero-subtitle max-w-4xl leading-relaxed text-[#595c5e]">
            Loqara gives every shopper instant answers by voice or chat — grounded in your
            products and policies, with live catalog search on connected stores.
          </p>

          <div className="landing-hero-cta">
            <GetStartedDialog
              source="hero"
              shimmer
              triggerClassName="relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-9 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(233,118,52,0.24)] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_16px_36px_rgba(233,118,52,0.3)] sm:h-14 sm:px-11 sm:text-base"
            />
          </div>
        </div>
      </div>

      <ConversationStage />
      <BrandMarquee />
    </section>
  )
}

function ConversationStage() {
  return (
    <div
      data-testid="hero-conversation-stage"
      className="landing-hero-stage relative mx-auto min-h-0 w-full max-w-[112rem] flex-1 overflow-hidden lg:overflow-visible"
    >
      <HeroFoxMedia />
      <HeroConversation />
    </div>
  )
}

// Platforms a VISITOR'S store runs on — the commerce providers we integrate
// with plus site builders the one-line embed works on. Client-relevant
// credibility (not our internal stack: OpenAI/Stripe/etc. mean nothing to a
// store owner choosing a chat widget).
const FEED_GLYPH =
  'M4 3a1 1 0 0 0 0 2 15 15 0 0 1 15 15 1 1 0 0 0 2 0A17 17 0 0 0 4 3Zm0 6a1 1 0 0 0 0 2 9 9 0 0 1 9 9 1 1 0 0 0 2 0A11 11 0 0 0 4 9Zm2.5 8A2.5 2.5 0 1 0 6.5 22a2.5 2.5 0 0 0 0-5Z'

const MARQUEE_ITEMS: BrandMark[] = [...BRAND_MARKS, { name: 'Product feeds', path: FEED_GLYPH }]

// One marquee copy must be wider than the viewport, or the two-copy -50% loop
// reveals empty space mid-scroll. Repeating the short brand list guarantees a
// single copy overflows even ultra-wide screens, so the loop reads as endless.
const LOOP = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

/** Infinite, seamlessly-looping row of platform logos across the hero bottom. */
function BrandMarquee() {
  return (
    <div
      data-testid="hero-platform-marquee"
      className="relative z-10 w-full shrink-0 overflow-hidden border-t border-white/10 bg-[#101213] py-3 shadow-[0_-12px_40px_rgba(16,18,19,0.12)]"
      aria-label="Platforms Loqara works with"
    >
      {/* Fade the logos into the dark glass at both edges (dark, not the bright image). */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#101213] via-[#101213]/85 to-transparent sm:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#101213] via-[#101213]/85 to-transparent sm:w-40" />
      <div className="landing-brand-marquee flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center gap-14 pr-14" aria-hidden={copy === 1}>
            {LOOP.map((b, i) => (
              <li
                key={`${b.name}-${i}`}
                className="flex items-center gap-2.5 whitespace-nowrap text-xl font-semibold tracking-tight text-white/60 transition-colors hover:text-white"
              >
                {b.wordmark ? (
                  // The mark IS the brand's lettering — no text label next to it.
                  <svg
                    viewBox={b.viewBox}
                    role="img"
                    aria-label={b.name}
                    className="h-5 w-auto shrink-0 fill-current"
                  >
                    <path d={b.path} />
                  </svg>
                ) : (
                  <>
                    <svg
                      viewBox={b.viewBox ?? '0 0 24 24'}
                      className="size-6 shrink-0 fill-current"
                      aria-hidden="true"
                    >
                      <path d={b.path} />
                    </svg>
                    {b.name}
                  </>
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
