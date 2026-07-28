import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { WIDGET_COMPONENTS, componentMeta, variantIdFor } from '@/lib/widget-components/meta'
import {
  assignedComponents,
  assignedComponentVariants,
  CORE_FOLDER,
} from '@/lib/widget-components/availability'
import { COMPONENT_FOLDERS, folderById } from '@/lib/widget-components/folders'

function fakeSvc(
  rows: { provider: string; component_key: string; variant_id: string }[],
  fail = false,
) {
  return {
    from: () => ({
      select: () => ({
        in: async (_col: string, folders: string[]) =>
          fail
            ? { data: null, error: new Error('boom') }
            : { data: rows.filter((r) => folders.includes(r.provider)), error: null },
      }),
    }),
  } as unknown as SupabaseClient
}

describe('widget component registry', () => {
  it('every component has at least one variant, and keys are unique', () => {
    const keys = WIDGET_COMPONENTS.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const c of WIDGET_COMPONENTS) expect(c.variants.length).toBeGreaterThan(0)
  })

  it('unknown variant falls back to the first variant', () => {
    expect(variantIdFor('product-cards', 'nope')).toBe('default')
    expect(variantIdFor('product-cards', 'compact')).toBe('compact')
    expect(componentMeta('missing')).toBeUndefined()
  })

  it('folders cover core + every provider', () => {
    expect(folderById(CORE_FOLDER)).toBeDefined()
    expect(folderById('woocommerce')).toBeDefined()
    expect(COMPONENT_FOLDERS.length).toBeGreaterThanOrEqual(6)
  })
})

describe('assignedComponentVariants', () => {
  const rows = [
    { provider: 'woocommerce', component_key: 'product-cards', variant_id: 'default' },
    { provider: 'woocommerce', component_key: 'product-cards', variant_id: 'compact' },
    { provider: 'woocommerce', component_key: 'order-status', variant_id: 'default' },
    { provider: 'shopify', component_key: 'product-cards', variant_id: 'default' },
    { provider: 'core', component_key: 'lead-form', variant_id: 'default' },
  ]

  it('merges the provider folder with core, per variant', async () => {
    const map = await assignedComponentVariants(fakeSvc(rows), 'woocommerce')
    expect([...(map.get('product-cards') ?? [])].sort()).toEqual(['compact', 'default'])
    expect(map.get('order-status')?.has('default')).toBe(true)
    expect(map.get('lead-form')?.has('default')).toBe(true)
  })

  it('a provider only sees its own assigned variants', async () => {
    const map = await assignedComponentVariants(fakeSvc(rows), 'shopify')
    expect(map.get('product-cards')?.has('compact')).toBe(false)
    expect(map.has('order-status')).toBe(false)
  })

  it('no provider → core only', async () => {
    const map = await assignedComponentVariants(fakeSvc(rows), null)
    expect(map.has('product-cards')).toBe(false)
    expect(map.has('lead-form')).toBe(true)
  })

  it('fails open (all components, all variants) on read errors', async () => {
    const map = await assignedComponentVariants(fakeSvc(rows, true), 'woocommerce')
    expect(map.get('product-cards')?.has('compact')).toBe(true)
    expect(map.has('lead-form')).toBe(true)
  })

  it('assignedComponents derives the key set', async () => {
    const set = await assignedComponents(fakeSvc(rows), 'woocommerce')
    expect(set.has('product-cards')).toBe(true)
    expect(set.has('room-visualizer')).toBe(false)
  })
})
