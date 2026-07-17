import type { CommerceProvider } from '@/lib/commerce/types'

export interface CommerceProviderPromptGuidance {
  queryGuidance?: string
  displayGuidance?: string
}

/**
 * Prompt-only provider metadata. This module must remain Edge-safe: the voice
 * custom-LLM route imports it through `lib/ai/prompt.ts`. Never import catalog
 * sync, live hydration, Node built-ins, or provider transports here.
 */
const promptGuidance: Readonly<Record<CommerceProvider, CommerceProviderPromptGuidance>> = Object.freeze({
  woocommerce: {},
  shopify: {},
  magento: {},
  verskis: {
    queryGuidance:
      'For this Verskis catalog, express hard attribute values in the catalog\'s ' +
      'canonical form rather than copying an inflected conversational phrase. Keep the product ' +
      'type and actual attribute value; omit filler words such as "color" when possible.',
    displayGuidance:
      'For a category browse, including a category plus one simple attribute such as color or ' +
      'function, display exactly min(20, the number of verified matching candidates). If at least 20 ' +
      'verified matches are available, pass exactly 20 ids; do not stop at 4-15. The first 4 are only ' +
      'preview cards and the rest remain available behind the full-results list.',
  },
  feed: {},
})

export const verskisPromptGuidance = promptGuidance.verskis

export function providerSearchQueryGuidance(
  config?: { provider: CommerceProvider },
): string {
  return config ? promptGuidance[config.provider].queryGuidance ?? '' : ''
}

export function providerDisplayGuidance(
  config?: { provider: CommerceProvider },
): string {
  return config ? promptGuidance[config.provider].displayGuidance ?? '' : ''
}
