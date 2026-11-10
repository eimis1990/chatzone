import Image from 'next/image'
import { MicIcon, SendHorizontalIcon } from 'lucide-react'
import { ProductCards } from '@/components/widget/ProductCards'
import { GetStartedDialog } from '../GetStartedDialog'
import { CHAIRS } from './products'
import { FOX, WidgetFrame } from './WidgetFrame'
import s from './night.module.css'

/**
 * The close: the day has run out and it is night again, with the hero's widget
 * still lit in the distance. Owns the `#get-started` hash, which must open the
 * signup dialog (blog CTAs and links in chat replies point at it) rather than
 * scroll anywhere.
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

      {/* The same widget and conversation as the hero, as a picture: scaled to a
          third, so its text is texture, not copy. */}
      <div className={s.far} aria-hidden="true">
        <div className={s.farGlow} />
        <div className={s.farPool} />
        <div className={s.farWindow}>
          <WidgetFrame>
            <p className={s.stamp}>Today, 02:47</p>
            <div className={s.thread} data-on="">
              <p className={`${s.bubble} ${s.fromCustomer}`}>Do you have the Luna in oak?</p>
              <div className={s.botRow}>
                <span className={s.botAvatar}>
                  <Image src={FOX} alt="" fill sizes="28px" className="object-contain p-0.5" />
                </span>
                <div className={s.turn}>
                  <p className={`${s.bubble} ${s.fromAgent}`}>
                    Yes, the Luna with oak legs is in stock.
                  </p>
                </div>
              </div>
              <div className={s.products}>
                <ProductCards products={CHAIRS} primaryColor="#e97634" variant="grid" />
              </div>
            </div>
            <div className={s.composer}>
              <span className={s.field} />
              <span className={s.micBtn}>
                <MicIcon className="size-4" />
              </span>
              <span className={s.sendBtn}>
                <SendHorizontalIcon className="size-4" />
              </span>
            </div>
          </WidgetFrame>
        </div>
      </div>
    </section>
  )
}
