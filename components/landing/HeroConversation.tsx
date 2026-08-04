'use client'

import Image from 'next/image'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { OrderStatusCard } from '@/components/widget/OrderStatusCard'
import { ProductCards } from '@/components/widget/ProductCards'
import {
  SAMPLE_CHAIR_PRODUCTS,
  SAMPLE_FURNITURE_PRODUCTS,
  SAMPLE_SHIPPED_ORDER,
} from '@/lib/widget-components/sample-data'
import { useReduce } from './use-reduce'

const PRIMARY = '#e97634'
const SCENE_DURATION_MS = 11_500
const SCENE_COUNT = 3
const IMAGE_CARD_QUERY = '(min-width: 768px) and (min-height: 821px)'

function subscribeToImageCardLayout(onChange: () => void) {
  const query = window.matchMedia(IMAGE_CARD_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useImageCardLayout() {
  return useSyncExternalStore(
    subscribeToImageCardLayout,
    () => window.matchMedia(IMAGE_CARD_QUERY).matches,
    () => false,
  )
}

export function HeroConversation() {
  const reduce = useReduce()
  const useImageCards = useImageCardLayout()
  const [scene, setScene] = useState(0)

  useEffect(() => {
    if (reduce) return

    const interval = window.setInterval(() => {
      setScene((current) => (current + 1) % SCENE_COUNT)
    }, SCENE_DURATION_MS)

    return () => window.clearInterval(interval)
  }, [reduce])

  return (
    <div
      key={scene}
      data-testid="hero-conversation-scene"
      data-scene={scene}
      className="hero-conversation-scene absolute inset-0 z-[3]"
      aria-label="Examples of Loqara helping shoppers"
    >
      {scene === 0 ? <StockConversation showThreeProducts={useImageCards} /> : null}
      {scene === 1 ? <FurnitureConversation useImageCards={useImageCards} /> : null}
      {scene === 2 ? <OrderConversation /> : null}
    </div>
  )
}

function StockConversation({ showThreeProducts }: { showThreeProducts: boolean }) {
  const products = SAMPLE_CHAIR_PRODUCTS.slice(0, showThreeProducts ? 3 : 2)

  return (
    <>
      <div className="hero-message hero-message-one absolute top-[5%] right-[2%] flex items-center gap-2 sm:right-[7%] lg:top-[3%] lg:right-[11%]">
        <CustomerBubble>Do you have this chair in walnut?</CustomerBubble>
        <CustomerAvatar />
      </div>

      <div className="hero-message hero-message-two absolute top-[25%] left-[1%] flex items-start gap-2 sm:left-[5%] lg:top-[14%] lg:left-[7%]">
        <FoxAvatar />
        <div className="w-[15.5rem] sm:w-[20rem]">
          <FoxBubble>
            Yes — here are {showThreeProducts ? 'three' : 'two'} chair options that fit beautifully.
          </FoxBubble>
          <div
            className="hero-rich-card pointer-events-none mt-2 rounded-[1.25rem] bg-white p-2 text-left shadow-[0_18px_50px_rgba(16,18,19,0.14)] ring-1 ring-black/[0.05]"
            aria-hidden="true"
          >
            <ProductCards
              products={products}
              primaryColor={PRIMARY}
              variant="compact"
            />
          </div>
        </div>
      </div>

      <div className="hero-message hero-message-three absolute top-[70%] left-[8%] hidden items-center gap-2 md:flex sm:right-[8%] sm:left-auto lg:top-[66%] lg:right-[12%]">
        <CustomerBubble compact>The Arlow looks perfect.</CustomerBubble>
        <CustomerAvatar />
      </div>
    </>
  )
}

function FurnitureConversation({ useImageCards }: { useImageCards: boolean }) {
  const products = SAMPLE_FURNITURE_PRODUCTS.slice(0, 2)

  return (
    <>
      <div className="hero-message hero-message-one absolute top-[4%] right-[2%] flex items-center gap-2 sm:right-[6%] lg:right-[10%]">
        <CustomerBubble>Can you find a compact sofa under €800?</CustomerBubble>
        <CustomerAvatar />
      </div>

      <div className="hero-message hero-message-two absolute top-[20%] left-[1%] flex items-start gap-2 sm:left-[5%] lg:top-[4%] lg:left-[7%]">
        <FoxAvatar />
        <div className="w-[15.5rem] sm:w-[20rem] lg:w-[21rem]">
          <FoxBubble>Absolutely — these two are a great fit.</FoxBubble>
          <div
            className="hero-rich-card pointer-events-none mt-2 rounded-[1.25rem] bg-white p-2 text-left shadow-[0_18px_50px_rgba(16,18,19,0.14)] ring-1 ring-black/[0.05]"
            aria-hidden="true"
          >
            <ProductCards
              products={products}
              primaryColor={PRIMARY}
              variant={useImageCards ? 'default' : 'compact'}
            />
          </div>
        </div>
      </div>

      <div className="hero-message hero-message-three absolute top-[70%] right-[7%] hidden items-center gap-2 md:flex lg:right-[11%]">
        <CustomerBubble compact>The Oslo looks perfect.</CustomerBubble>
        <CustomerAvatar />
      </div>
    </>
  )
}

function OrderConversation() {
  return (
    <>
      <div className="hero-message hero-message-one absolute top-[4%] right-[2%] flex items-center gap-2 sm:right-[6%] lg:right-[10%]">
        <CustomerBubble>Where is order #10482?</CustomerBubble>
        <CustomerAvatar />
      </div>

      <div className="hero-message hero-message-two absolute top-[27%] left-[1%] flex items-start gap-2 sm:left-[5%] lg:top-[22%] lg:left-[7%]">
        <FoxAvatar />
        <div className="w-[17rem] sm:w-[22rem]">
          <FoxBubble>It&apos;s on the way — here&apos;s the latest update.</FoxBubble>
          <div
            className="hero-rich-card pointer-events-none mt-2 rounded-[1.25rem] bg-white p-2 text-left shadow-[0_18px_50px_rgba(16,18,19,0.14)] ring-1 ring-black/[0.05]"
            aria-hidden="true"
          >
            <OrderStatusCard
              order={SAMPLE_SHIPPED_ORDER}
              primaryColor={PRIMARY}
              variant="timeline"
            />
          </div>
        </div>
      </div>

      <div className="hero-message hero-message-three absolute top-[70%] right-[7%] hidden items-center gap-2 md:flex lg:right-[11%]">
        <CustomerBubble compact>Perfect — thanks!</CustomerBubble>
        <CustomerAvatar />
      </div>
    </>
  )
}

function CustomerBubble({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div
      className={`${compact ? 'max-w-[11.75rem] sm:max-w-[15rem]' : 'max-w-[12.5rem] sm:max-w-[16rem]'} rounded-[1.25rem] bg-white px-3.5 py-2.5 text-left text-[0.7rem] font-medium leading-relaxed text-[#343638] shadow-[0_14px_45px_rgba(16,18,19,0.12)] ring-1 ring-black/[0.04] sm:px-4 sm:py-3 sm:text-sm`}
    >
      {children}
    </div>
  )
}

function FoxBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[13.5rem] rounded-[1.25rem] bg-primary px-3.5 py-2.5 text-left text-[0.7rem] font-medium leading-relaxed text-white shadow-[0_16px_42px_rgba(233,118,52,0.3)] sm:max-w-[18rem] sm:px-4 sm:py-3 sm:text-sm">
      {children}
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
