import type { BotConfig, Plan } from '@/lib/types'
import { entitlementsFor, isInternalOrg, type Entitlements } from '@/lib/entitlements'

export interface OrganizationPolicyRow {
  plan?: Plan | null
  is_demo?: boolean | null
  is_platform?: boolean | null
  free_policy_paused?: boolean | null
  free_legacy?: boolean | null
  free_policy_effective_at?: string | null
}

/** All callers use the same temporary legacy-Free policy, including previews. */
export function organizationEntitlements(org: OrganizationPolicyRow, now = new Date()): Entitlements {
  if (isInternalOrg(org)) return { ...entitlementsFor('enterprise') }
  const ent = { ...entitlementsFor(org.plan) }
  if (org.plan === 'free' && org.free_legacy &&
      (org.free_policy_paused || !org.free_policy_effective_at || now.getTime() < Date.parse(org.free_policy_effective_at))) {
    return { ...ent, conversations: 100, handoff: true, productSearch: true, orderLookup: true, analytics: 'full' }
  }
  return ent
}

/** Effective runtime config only: do not overwrite saved settings on downgrade. */
export function applyPlanToConfig(config: BotConfig, ent: Entitlements): BotConfig {
  const languages = config.languages?.length ? config.languages : ['en' as const]
  const primary = config.defaultLanguage && languages.includes(config.defaultLanguage)
    ? config.defaultLanguage : languages[0]
  const allowed = languages.length > ent.maxLanguages
    ? [primary, ...languages.filter((l) => l !== primary)].slice(0, ent.maxLanguages) : languages
  const result: BotConfig = {
    ...config,
    languages: allowed, defaultLanguage: primary,
    showLanguageSelector: allowed.length > 1 && config.showLanguageSelector,
    theme: { ...config.theme, showHandoffButton: ent.handoff && config.theme.showHandoffButton !== false,
      hideBadge: ent.removeBadge && Boolean(config.theme.hideBadge) },
    leadCapture: { ...config.leadCapture, enabled: ent.leadCapture && config.leadCapture.enabled },
    commerce: { ...config.commerce, enabled: ent.productSearch && config.commerce.enabled,
      orderLookupAllowed: ent.orderLookup },
    content: Object.fromEntries(Object.entries(config.content ?? {}).map(([lang, content]) => [lang,
      content ? { ...content, suggestedQuestions: content.suggestedQuestions.filter((q) => {
        if (typeof q === 'string') return true
        return !((q.action === 'handoff' && !ent.handoff) || (q.action === 'lead' && !ent.leadCapture) ||
          (q.action === 'products' && !ent.productSearch) || (q.action === 'order' && !ent.orderLookup))
      }) } : content])),
  }
  return result
}

/** Block newly enabled paid settings; keep dormant saved configuration intact. */
export function validatePlanConfig(next: BotConfig, current: BotConfig, ent: Entitlements): string | null {
  if (next.languages.length > ent.maxLanguages) return `Your plan supports ${ent.maxLanguages} visitor language.`
  if (!ent.handoff && next.theme?.showHandoffButton && !current.theme?.showHandoffButton) return 'Live handoff requires Basic or above.'
  if (!ent.leadCapture && next.leadCapture?.enabled && !current.leadCapture?.enabled) return 'Lead capture requires Basic or above.'
  if (!ent.productSearch && next.commerce?.enabled && !current.commerce?.enabled) return 'Product search requires Basic or above.'
  if (!ent.removeBadge && next.theme?.hideBadge && !current.theme?.hideBadge) return 'Badge removal requires Starter or above.'
  return null
}
