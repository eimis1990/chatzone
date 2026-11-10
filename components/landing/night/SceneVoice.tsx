'use client'

import { useEffect, useRef, useState } from 'react'
import { ProductCards } from '@/components/widget/ProductCards'
import { SiriOrb } from '@/components/widget/SiriOrb'
import type { CommerceProduct } from '@/lib/commerce/types'
import { Scene, at } from './Scene'
import s from './night.module.css'

const LOVESEAT: CommerceProduct[] = [
  {
    id: 'oslo-loveseat',
    title: 'Oslo loveseat, oak legs',
    price: '€549',
    url: '#',
    imageUrl: '/component-previews/sofa.webp',
    inStock: true,
  },
]

type Phase = 'listening' | 'speaking'

/**
 * 04:05 — a voice call. The orb is the widget's own (SiriOrb), calm while the
 * shopper talks and lively while Loqara answers; which of the two depends on
 * how far the scene has scrolled.
 */
export function SceneVoice() {
  const visual = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('listening')

  useEffect(() => {
    const section = visual.current?.closest('section')
    if (!section) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = section.getBoundingClientRect()
      const vh = window.innerHeight
      // Pinned (desktop): progress through the pin. Flowing (mobile): how far
      // the section has travelled up the screen.
      const p = r.height > vh * 1.5 ? -r.top / (r.height - vh) : (vh * 0.6 - r.top) / r.height
      // Matches the answer bubble's reveal below.
      setPhase(p >= 0.3 && p < 0.72 ? 'speaking' : 'listening')
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <Scene
      minutes={245}
      when="04:05"
      sky="linear-gradient(180deg, #1b1c4d 0%, #221d52 50%, #2a2058 100%)"
      stars={0.48}
      title={<>Marta is feeding the baby. She asks out loud instead.</>}
      body={
        <>
          With the voice add-on, shoppers tap the call button in the widget and just talk. Loqara
          searches your catalogue, answers out loud in English or Lithuanian, and puts the products
          on screen while it speaks.
        </>
      }
    >
      <div ref={visual} className={s.call}>
        <div className={s.orb} aria-hidden="true">
          <SiriOrb size={208} color="#e97634" dark activity={phase === 'speaking' ? 1 : 0.2} />
        </div>
        <p className={s.callState}>
          <i aria-hidden="true" />
          {phase === 'speaking' ? 'Loqara is speaking' : 'Listening'}
        </p>
        <div className={s.talk}>
          <p className={`${s.step} ${s.bubble} ${s.fromCustomer}`} style={at(6, 15)}>
            Do you have a small sofa for a two-metre wall?
          </p>
          <p className={`${s.step} ${s.bubble} ${s.fromAgent}`} style={at(30, 40)}>
            Yes. The Oslo loveseat is 158 centimetres wide, so it fits with room to spare. It is 549
            euros and in stock.
          </p>
          {/* The real widget component, inert: its row links out. */}
          <div className={`${s.step} ${s.shown}`} style={at(52, 62)} aria-hidden="true">
            <ProductCards products={LOVESEAT} primaryColor="#e97634" variant="compact" />
          </div>
        </div>
      </div>
    </Scene>
  )
}
