import SocialCards from '@/components/ui/card-fan-carousel'
import { Shimmer } from './Shimmer'

const TITLE = 'A widget that fits your brand'
const DESCRIPTION =
  'Tweak colors, shapes, backgrounds, voice and more — then push it live to your site in one click. Want something bespoke? Custom designs on request.'

const CHAT_VIEW_ALTS: Record<string, string> = {
  'chatview-0.webp': 'Purple Loud.Chapted chat widget with four quick actions',
  'chatview-1.webp': 'Green FAMLAI chat widget with product and booking actions',
  'chatview-2.webp': 'Rose MONAI chat widget with agent handoff and support actions',
  'chatview-3.webp': 'Black Foxx.AI chat widget with delivery and returns actions',
  'chatview-4.webp': 'Blue BunAI chat widget with a compact welcome layout',
  'chatview-5.webp': 'Red Owla chat widget with product, service, and booking actions',
  'chatview-6.webp': 'Blue and black DAROM.AI chat widget with quick actions',
  'chatview-7.webp': 'Beige NAMAI chat widget with a centered brand layout',
  'chatview-8.webp': 'Pink Sun.Solutions chat widget with five support actions',
  'chatview-9.webp': 'Amber Smarty chat widget with a dark conversation layout',
  'chatview-10.webp': 'Cream Domo.AI chat widget with a minimal welcome layout',
}

/** Showcase variant: a fanned, draggable card carousel on a white background. */
export function ShowcaseFan({ images }: { images: string[] }) {
  const cards = images.map((src, i) => {
    const fileName = src.split('/').at(-1) || ''
    return {
      imgUrl: src,
      alt: CHAT_VIEW_ALTS[fileName] || `Loqara chat widget design ${i + 1}`,
    }
  })

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
