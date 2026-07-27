import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { WIDGET_COMPONENTS, componentMeta, variantIdFor } from '@/lib/widget-components/meta'
import { assignedComponents, CORE_FOLDER } from '@/lib/widget-components/availability'
import { COMPONENT_FOLDERS, folderById } from '@/lib/widget-components/folders'

function fakeSvc(rows: { provider: string; component_key: string }[], fail = false) {
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

describe('assignedComponents', () => {
  const rows = [
    { provider: 'woocommerce', component_key: 'product-cards' },
    { provider: 'woocommerce', component_key: 'order-status' },
    { provider: 'shopify', component_key: 'product-cards' },
    { provider: 'core', component_key: 'lead-form' },
  ]

  it('merges the provider folder with core', async () => {
    const set = await assignedComponents(fakeSvc(rows), 'woocommerce')
    expect(set.has('product-cards')).toBe(true)
    expect(set.has('order-status')).toBe(true)
    expect(set.has('lead-form')).toBe(true)
  })

  it('a provider only sees its own folder', async () => {
    const set = await assignedComponents(fakeSvc(rows), 'shopify')
    expect(set.has('order-status')).toBe(false)
    expect(set.has('lead-form')).toBe(true)
  })

  it('no provider → core only', async () => {
    const set = await assignedComponents(fakeSvc(rows), null)
    expect(set.has('product-cards')).toBe(false)
    expect(set.has('lead-form')).toBe(true)
  })

  it('fails open on read errors so live widgets keep working', async () => {
    const set = await assignedComponents(fakeSvc(rows, true), 'woocommerce')
    expect(set.has('product-cards')).toBe(true)
    expect(set.has('lead-form')).toBe(true)
  })
})
