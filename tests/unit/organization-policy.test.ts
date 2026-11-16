import { describe, expect, it } from 'vitest'
import { organizationEntitlements, applyPlanToConfig } from '@/lib/organization-policy'
import { entitlementsFor } from '@/lib/entitlements'
import { defaultBotConfig } from '@/lib/validation/schemas'
import { orderLookupEnabled } from '@/lib/commerce/capabilities'
import { conversationTopupFor, PLANS } from '@/lib/plans-catalog'

describe('Basic and organization policies', () => {
  it('grants the agreed Basic features without order lookup or branding removal', () => {
    expect(entitlementsFor('basic')).toMatchObject({ maxBots: 1, maxLanguages: 1, conversations: 400,
      handoff: true, leadCapture: true, productSearch: true, orderLookup: false,
      dictation: true, analytics: 'full', removeBadge: false, teams: false })
    expect(PLANS.basic.monthly).toBe(49)
  })
  it('expires legacy Free exactly at the announced time', () => {
    const org = { plan: 'free' as const, free_legacy: true, free_policy_effective_at: '2026-12-16T10:00:00Z' }
    expect(organizationEntitlements(org, new Date('2026-12-16T09:59:59Z'))).toMatchObject({ conversations: 100, handoff: true })
    expect(organizationEntitlements(org, new Date('2026-12-16T10:00:00Z'))).toMatchObject({ conversations: 50, handoff: false })
    expect(organizationEntitlements({ plan: 'free', free_legacy: true })).toMatchObject({ conversations: 100 })
    expect(organizationEntitlements({ plan: 'free' })).toMatchObject({ conversations: 50 })
  })
  it('never gives a paid plan extra rights because of stale legacy flags', () => {
    expect(organizationEntitlements({ plan: 'basic', free_legacy: true })).toEqual(entitlementsFor('basic'))
    expect(organizationEntitlements({ plan: 'free', is_demo: true }).orderLookup).toBe(true)
  })
  it('preserves settings while removing forbidden runtime capabilities', () => {
    const config = defaultBotConfig('Test')
    config.languages = ['en', 'lt']; config.defaultLanguage = 'lt'; config.showLanguageSelector = true
    config.theme.hideBadge = true
    config.commerce = { enabled: true, provider: 'woocommerce', storeUrl: 'https://shop.test', restKey: 'key', restSecret: 'secret', orderLookupAllowed: true }
    const effective = applyPlanToConfig(config, entitlementsFor('basic'))
    expect(effective.languages).toEqual(['lt'])
    expect(effective.theme.hideBadge).toBe(false)
    expect(effective.commerce.enabled).toBe(true)
    expect(orderLookupEnabled(effective.commerce)).toBe(false)
    expect(config.languages).toEqual(['en', 'lt'])
    expect(config.theme.hideBadge).toBe(true)
    expect(orderLookupEnabled(applyPlanToConfig(config, entitlementsFor('starter')).commerce)).toBe(true)
  })
  it('chooses the proper pack and forbids Free purchases', () => {
    expect(conversationTopupFor('free')).toBeNull()
    expect(conversationTopupFor('basic')).toMatchObject({ conversations: 200, price: 15 })
    expect(conversationTopupFor('starter')).toMatchObject({ conversations: 1000, price: 15 })
  })
})
