import { describe, expect, it } from 'vitest'
import type { BotConfig } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import {
  commerceProviderProfile,
  commerceProviderProfiles,
  providerCandidateDetailsLimit,
  providerCompleteDisplaySelection,
  providerDisplayGuidance,
  providerProductDetailsReference,
  providerSearchQueryGuidance,
} from '@/lib/products/provider-profiles'

type Commerce = NonNullable<BotConfig['commerce']>

describe('commerce provider profiles', () => {
  it('has an explicit profile for every provider', () => {
    expect(Object.keys(commerceProviderProfiles).sort()).toEqual([
      'feed',
      'magento',
      'shopify',
      'verskis',
      'woocommerce',
    ])
  })

  it('keeps Verskis ranking isolated from shared providers', () => {
    const woo = commerceProviderProfile({
      enabled: true,
      provider: 'woocommerce',
      storeUrl: 'https://woo.test',
    } as Commerce)
    const shopify = commerceProviderProfile({
      enabled: true,
      provider: 'shopify',
      shopifyDomain: 'shop.test',
      shopifyToken: 'token',
    } as Commerce)
    const magento = commerceProviderProfile({
      enabled: true,
      provider: 'magento',
      storeUrl: 'https://magento.test',
    } as Commerce)
    const verskis = commerceProviderProfile({
      enabled: true,
      provider: 'verskis',
      storeUrl: 'https://verskis.test',
    } as Commerce)

    expect(woo.semantic?.matcherRpc).toBe('match_products')
    expect(shopify.semantic?.matcherRpc).toBe('match_products')
    expect(magento.semantic?.matcherRpc).toBe('match_products')
    expect(verskis.semantic?.matcherRpc).toBe('match_products_verskis')
    expect(woo.semantic?.candidatePoolSize).toBeUndefined()
    expect(verskis.semantic?.candidatePoolSize?.(20)).toBe(32)
    expect(verskis.semantic?.candidatePoolSize?.(40)).toBe(40)
    expect(woo.semantic?.normalizeQuery).toBeUndefined()
    expect(verskis.semantic?.normalizeQuery?.('sofa-lova ruda')).toBe(
      'sofa ruda miegojimo funkcija',
    )
    expect(verskis.semantic?.normalizeQuery?.('žalia kėdė')).toBe('žalia kėdė')
  })

  it('scopes query guidance and semantic capability by provider', () => {
    const woo = {
      enabled: true,
      provider: 'woocommerce',
      storeUrl: 'https://woo.test',
    } as Commerce
    const verskis = {
      enabled: true,
      provider: 'verskis',
      storeUrl: 'https://verskis.test',
    } as Commerce
    const feed = {
      enabled: true,
      provider: 'feed',
      feedUrl: 'https://feed.test/products.xml',
    } as Commerce

    expect(providerSearchQueryGuidance(woo)).toBe('')
    expect(providerSearchQueryGuidance(verskis)).toContain('canonical form')
    expect(providerCandidateDetailsLimit(woo)).toBe(8)
    expect(providerCandidateDetailsLimit(verskis)).toBe(20)
    expect(providerDisplayGuidance(woo)).toBe('')
    expect(providerDisplayGuidance(verskis)).toContain('pass exactly 20 ids')
    expect(commerceProviderProfile(feed).semantic).toBeUndefined()
  })

  it('owns catalog-sync and product-reference quirks without shared provider branches', () => {
    const woo = {
      enabled: true,
      provider: 'woocommerce',
      storeUrl: 'https://woo.test',
    } as Commerce
    const verskis = {
      enabled: true,
      provider: 'verskis',
      storeUrl: 'https://verskis.test',
    } as Commerce
    const feed = {
      enabled: true,
      provider: 'feed',
      feedUrl: 'https://feed.test/products.xml',
    } as Commerce
    const product = {
      id: '42',
      title: 'Chair',
      price: '99 €',
      url: 'https://verskis.test/chair-42',
      inStock: true,
    }

    expect(commerceProviderProfile(woo).catalogSync?.skipAiEnrichment).toBeFalsy()
    expect(commerceProviderProfile(verskis).catalogSync?.skipAiEnrichment).toBe(true)
    expect(commerceProviderProfile(feed).catalogSync).toBeUndefined()
    expect(providerProductDetailsReference(woo, product.id, product)).toBe('42')
    expect(providerProductDetailsReference(verskis, product.id, product)).toBe(product.url)
    expect(providerProductDetailsReference(verskis, product.id)).toBe('42')
  })

  it('completes simple Verskis browse sets from structured attributes only', () => {
    const verskis = {
      enabled: true,
      provider: 'verskis',
      storeUrl: 'https://verskis.test',
    } as Commerce
    const woo = {
      enabled: true,
      provider: 'woocommerce',
      storeUrl: 'https://woo.test',
    } as Commerce
    const chair = (index: number): CommerceProduct => ({
      id: `chair-${index}`,
      title: `Kėdė K${index}`,
      price: '50 €',
      url: `https://verskis.test/chair-${index}`,
      inStock: true,
      details:
        `Categories: Kėdės\nAttributes: Plotis: ${40 + index} cm; ` +
        `Spalva: ${index % 2 ? 'Alyvuogių žalia' : 'Tamsiai žalia'}`,
    })
    const greenChairs = Array.from({ length: 24 }, (_, index) => chair(index))
    const selected = greenChairs.slice(0, 8)

    expect(
      providerCompleteDisplaySelection(verskis, {
        query: 'žalia kėdė',
        selected,
        rankedCandidates: greenChairs,
        limit: 20,
      }),
    ).toEqual(greenChairs.slice(0, 20))
    expect(
      providerCompleteDisplaySelection(woo, {
        query: 'green chair',
        selected,
        rankedCandidates: greenChairs,
        limit: 20,
      }),
    ).toEqual(selected)
  })

  it('completes all verified Verskis sofa beds without including normal sofas or corners', () => {
    const verskis = {
      enabled: true,
      provider: 'verskis',
      storeUrl: 'https://verskis.test',
    } as Commerce
    const product = (
      id: string,
      title: string,
      sleepingFunction: string,
    ): CommerceProduct => ({
      id,
      title,
      price: '900 €',
      url: `https://verskis.test/${id}`,
      inStock: true,
      details:
        `Categories: Sofos\nAttributes: Ilgis: 220 cm; ` +
        `Miegojimo funkcija: ${sleepingFunction}; Spalva: Pilka`,
    })
    const sleepers = Array.from({ length: 9 }, (_, index) =>
      product(`sofa-${index}`, `Sofa S${index}`, 'Yra'),
    )
    const ranked = [
      ...sleepers,
      product('normal-sofa', 'Sofa N1', 'Nėra'),
      product('corner', 'Minkštas kampas C1', 'Yra'),
    ]

    expect(
      providerCompleteDisplaySelection(verskis, {
        query: 'sofa lova',
        selected: [...sleepers, ranked.at(-1)!],
        rankedCandidates: ranked,
        limit: 20,
      }),
    ).toEqual(sleepers)
  })
})
