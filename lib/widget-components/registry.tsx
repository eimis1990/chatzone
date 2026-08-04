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
import { QuickActionButtons } from '@/components/widget/QuickActionButtons'
import { SAMPLE_FURNITURE_PRODUCTS, SAMPLE_SHIPPED_ORDER } from './sample-data'

// Product shots generated for these samples — scripts/gen-component-previews.mjs.
const PREVIEW_PRIMARY = '#e8590c'

const SAMPLE_ACTIONS = ['Show bestsellers', 'Track my order', 'Opening hours', 'Talk to a human']
const noopAsync = async () => {}
const noop = () => {}

const PREVIEWS: Record<string, () => ReactNode> = {
  'product-cards:default': () => (
    <ProductCards products={SAMPLE_FURNITURE_PRODUCTS} primaryColor={PREVIEW_PRIMARY} />
  ),
  'product-cards:compact': () => (
    <ProductCards products={SAMPLE_FURNITURE_PRODUCTS} primaryColor={PREVIEW_PRIMARY} variant="compact" />
  ),
  'product-cards:overlay': () => (
    <ProductCards products={SAMPLE_FURNITURE_PRODUCTS} primaryColor={PREVIEW_PRIMARY} variant="overlay" />
  ),
  'product-cards:grid': () => (
    <ProductCards products={SAMPLE_FURNITURE_PRODUCTS} primaryColor={PREVIEW_PRIMARY} variant="grid" />
  ),
  'order-status:default': () => (
    <OrderStatusCard order={SAMPLE_SHIPPED_ORDER} primaryColor={PREVIEW_PRIMARY} />
  ),
  'order-status:timeline': () => (
    <OrderStatusCard order={SAMPLE_SHIPPED_ORDER} primaryColor={PREVIEW_PRIMARY} variant="timeline" />
  ),
  'quick-actions:default': () => (
    <QuickActionButtons questions={SAMPLE_ACTIONS} primaryColor={PREVIEW_PRIMARY} onSelect={noop} />
  ),
  'quick-actions:pills': () => (
    <QuickActionButtons
      questions={SAMPLE_ACTIONS}
      variant="pills"
      primaryColor={PREVIEW_PRIMARY}
      onSelect={noop}
    />
  ),
  'quick-actions:list': () => (
    <QuickActionButtons
      questions={SAMPLE_ACTIONS}
      variant="list"
      primaryColor={PREVIEW_PRIMARY}
      onSelect={noop}
    />
  ),
  'lead-form:default': () => (
    <LeadForm
      fields={SAMPLE_LEAD_FIELDS}
      primaryColor={PREVIEW_PRIMARY}
      onSubmit={noopAsync}
      onDismiss={noop}
    />
  ),
  'lead-form:minimal': () => (
    <LeadForm
      fields={SAMPLE_LEAD_FIELDS}
      primaryColor={PREVIEW_PRIMARY}
      variant="minimal"
      onSubmit={noopAsync}
      onDismiss={noop}
    />
  ),
  'room-visualizer:default': () => (
    <RoomTray
      products={SAMPLE_FURNITURE_PRODUCTS.slice(0, 2)}
      primaryColor={PREVIEW_PRIMARY}
      language="en"
      onRemove={noop}
      onOpen={noop}
    />
  ),
  'room-visualizer:subtle': () => (
    <RoomTray
      products={SAMPLE_FURNITURE_PRODUCTS.slice(0, 2)}
      primaryColor={PREVIEW_PRIMARY}
      language="en"
      variant="subtle"
      onRemove={noop}
      onOpen={noop}
    />
  ),
}

const SAMPLE_LEAD_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email', required: true },
]

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
