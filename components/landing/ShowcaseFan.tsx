import SocialCards from '@/components/ui/card-fan-carousel'
import { Shimmer } from './Shimmer'

const TITLE = 'A widget that fits your brand'
const DESCRIPTION =
  'Tweak colors, shapes, backgrounds, voice and more — then push it live to your site in one click. Want something bespoke? Custom designs on request.'

/** Showcase variant: a fanned, draggable card carousel on a white background. */
export function ShowcaseFan({ images }: { images: string[] }) {
  const cards = images.map((src, i) => ({ imgUrl: src, alt: `Loqara chat widget design ${i + 1}` }))

  return (
    // `isolate` keeps the fan cards' z-indexes inside this section's own stacking
    // context so they never paint over the fixed header.
    <section id="showcase" className="isolate overflow-x-clip bg-white text-gray-900 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-5 pt-24 text-center">
        {/* Large but slim (light-weight) heading — an airy, editorial feel. */}
        <h2 className="text-balance text-5xl font-light tracking-tight text-gray-900 sm:text-6xl">
          {TITLE}
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
          {DESCRIPTION}
        </p>
      </div>

      <div className="mx-auto mt-14 max-w-6xl px-5">
        <SocialCards cards={cards} />
      </div>

      {/* CTA sits under the carousel + its dots. */}
      <div className="flex justify-center px-5 pb-28 pt-12">
        <a
          href="#get-started"
          className="relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-[color,background-color,transform] hover:scale-[1.03] hover:bg-primary-hover active:scale-[0.97]"
        >
          <span className="relative z-10">Get started</span>
          <Shimmer />
        </a>
      </div>
    </section>
  )
}
