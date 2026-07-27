'use client'

/**
 * Rendered previews for the widget component library — real widget components
 * fed sample data. Textual metadata (names, variants, core flag) is the
 * server-safe ./meta.ts; keys here MUST match `${componentKey}:${variantId}`.
 */

import type { ReactNode } from 'react'
import { ProductCards } from '@/components/widget/ProductCards'
import { OrderStatusCard } from '@/components/widget/OrderStatusCard'
import { LeadForm } from '@/components/widget/LeadForm'
import { RoomTray } from '@/components/widget/RoomVisualizer'
import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'

const SAMPLE_PRODUCTS: CommerceProduct[] = [
  {
    id: 'demo-1',
    title: 'Oslo 3-seat sofa, oak legs',
    price: '€749',
    url: '#',
    imageUrl: '/landing/faq-illustration.webp',
    inStock: true,
  },
  { id: 'demo-2', title: 'Luna lounge chair', price: '€329', url: '#', inStock: true },
  { id: 'demo-3', title: 'Nordic coffee table', price: '€189', url: '#', inStock: false },
]

const SAMPLE_ORDER: OrderStatus = {
  found: true,
  orderNumber: '10482',
  status: 'shipped',
  total: '148.90',
  currency: 'EUR',
  items: [
    { name: 'Oslo cushion set', quantity: 2, total: '99.90' },
    { name: 'Care kit', quantity: 1, total: '49.00' },
  ],
}

const PREVIEW_PRIMARY = '#e8590c'
const noopAsync = async () => {}
const noop = () => {}

const PREVIEWS: Record<string, () => ReactNode> = {
  'product-cards:default': () => (
    <ProductCards products={SAMPLE_PRODUCTS} primaryColor={PREVIEW_PRIMARY} />
  ),
  'product-cards:compact': () => (
    <ProductCards products={SAMPLE_PRODUCTS} primaryColor={PREVIEW_PRIMARY} variant="compact" />
  ),
  'order-status:default': () => (
    <OrderStatusCard order={SAMPLE_ORDER} primaryColor={PREVIEW_PRIMARY} />
  ),
  'lead-form:default': () => (
    <LeadForm
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'email', label: 'Email', required: true },
      ]}
      primaryColor={PREVIEW_PRIMARY}
      onSubmit={noopAsync}
      onDismiss={noop}
    />
  ),
  'room-visualizer:default': () => (
    <RoomTray
      products={SAMPLE_PRODUCTS.slice(0, 2)}
      primaryColor={PREVIEW_PRIMARY}
      language="en"
      onRemove={noop}
      onOpen={noop}
    />
  ),
}

export function ComponentPreview({
  componentKey,
  variantId = 'default',
}: {
  componentKey: string
  variantId?: string
}) {
  const render = PREVIEWS[`${componentKey}:${variantId}`]
  if (!render) {
    return (
      <p className="text-xs text-muted-foreground">No preview available for {componentKey}.</p>
    )
  }
  return <>{render()}</>
}
