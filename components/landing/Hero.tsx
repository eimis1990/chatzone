import { Plus_Jakarta_Sans } from 'next/font/google'
import Image from 'next/image'
import { GetStartedDialog } from './GetStartedDialog'
import { BRAND_MARKS, type BrandMark } from './brand-marks'

const heroFont = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' })

export function Hero() {
  return (
    <section className="landing-hero relative flex h-svh min-h-[40rem] flex-col overflow-hidden bg-[#fbfbfa] text-[#101213]">
      <div className="landing-hero-copy relative z-10 mx-auto flex w-full max-w-7xl shrink-0 flex-col items-center px-5 text-center">
        <div className="flex max-w-5xl flex-col items-center">
          <h1 className={`${heroFont.className} landing-hero-title text-balance font-extrabold leading-[0.98] tracking-[-0.055em]`}>
            Let your customers
            <br />
            <span className="text-primary">talk to your store.</span>
          </h1>

          <p className="landing-hero-subtitle max-w-4xl leading-relaxed text-[#595c5e]">
            Loqara gives your store a real voice agent — shoppers ask out loud and hear answers
            from your products, policies, and live order status. Prefer to type? The same AI handles
            chat.
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
      <Image
        src="/landing/hero-fox-higgsfield.webp"
        alt="Loqara's fox support agent standing ready to help"
        width={1038}
        height={2296}
        loading="eager"
        sizes="(max-width: 640px) 66vw, (max-width: 1024px) 42vw, 34vw"
        className="landing-hero-fox pointer-events-none absolute z-[2] w-auto max-w-none -translate-x-1/2 select-none drop-shadow-[0_24px_32px_rgba(16,18,19,0.12)]"
      />

      <div className="hero-message hero-message-one absolute top-[5%] right-[2%] z-[3] flex items-center gap-2 sm:right-[7%] lg:top-[3%] lg:right-[11%]">
        <div className="max-w-[12.5rem] rounded-[1.25rem] bg-white px-3.5 py-2.5 text-left text-[0.7rem] font-medium leading-relaxed text-[#343638] shadow-[0_14px_45px_rgba(16,18,19,0.12)] ring-1 ring-black/[0.04] sm:max-w-[16rem] sm:px-4 sm:py-3 sm:text-sm">
          Do you have this chair in walnut?
        </div>
        <CustomerAvatar />
      </div>

      <div className="hero-message hero-message-two absolute top-[36%] left-[1%] z-[3] flex items-center gap-2 sm:left-[7%] lg:top-[30%] lg:left-[11%]">
        <FoxAvatar />
        <div className="max-w-[13.5rem] rounded-[1.25rem] bg-primary px-3.5 py-2.5 text-left text-[0.7rem] font-medium leading-relaxed text-white shadow-[0_16px_42px_rgba(233,118,52,0.3)] sm:max-w-[18rem] sm:px-4 sm:py-3 sm:text-sm">
          Yes — it&apos;s in stock. I can show you two matching tables, too.
        </div>
      </div>

      <div className="hero-message hero-message-three absolute top-[68%] left-[8%] z-[3] flex items-center gap-2 sm:right-[8%] sm:left-auto lg:top-[62%] lg:right-[12%]">
        <div className="max-w-[11.75rem] rounded-[1.25rem] bg-white px-3.5 py-2.5 text-left text-[0.7rem] font-medium leading-relaxed text-[#343638] shadow-[0_14px_45px_rgba(16,18,19,0.12)] ring-1 ring-black/[0.04] sm:max-w-[15rem] sm:px-4 sm:py-3 sm:text-sm">
          Perfect. Show me the best match.
        </div>
        <CustomerAvatar />
      </div>
    </div>
  )
}

function CustomerAvatar() {
  return (
    <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-[#eeeae5] ring-[3px] ring-white sm:size-10">
      <Image
        src="/landing/hero-customer-higgsfield.webp"
        alt=""
        fill
        sizes="44px"
        aria-hidden="true"
        className="object-cover"
      />
    </span>
  )
}

function FoxAvatar() {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-[3px] ring-white sm:size-10">
      <Image
        src="/loqara-logo-colorful.webp"
        alt=""
        fill
        sizes="44px"
        aria-hidden="true"
        className="object-contain p-1"
      />
    </span>
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
      className="relative z-10 w-full shrink-0 overflow-hidden border-t border-white/10 bg-[#101213] py-4 shadow-[0_-12px_40px_rgba(16,18,19,0.12)]"
    >
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
        Works wherever your store runs
      </p>
      {/* Fade the logos into the dark glass at both edges (dark, not the bright image). */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#101213] via-[#101213]/85 to-transparent sm:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#101213] via-[#101213]/85 to-transparent sm:w-40" />
      <div className="landing-brand-marquee flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center gap-14 pr-14" aria-hidden={copy === 1}>
            {LOOP.map((b, i) => (
              <li
                key={`${b.name}-${i}`}
                className="flex items-center gap-3 whitespace-nowrap text-2xl font-semibold tracking-tight text-white/60 transition-colors hover:text-white"
              >
                {b.wordmark ? (
                  // The mark IS the brand's lettering — no text label next to it.
                  <svg
                    viewBox={b.viewBox}
                    role="img"
                    aria-label={b.name}
                    className="h-6 w-auto shrink-0 fill-current"
                  >
                    <path d={b.path} />
                  </svg>
                ) : (
                  <>
                    <svg
                      viewBox={b.viewBox ?? '0 0 24 24'}
                      className="size-7 shrink-0 fill-current"
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
