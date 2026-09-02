import type { BotConfig } from '@/lib/types'
import type { ShownProducts } from '@/lib/ai/prompt'
import { storeConfigured } from '@/lib/commerce/capabilities'

/**
 * Fast lane: a visitor turn that the knowledge base answers convincingly and
 * that no commerce tool owns is answered with NO tools and the plain KB prompt.
 * Everything else takes the full path (commerce prompt + tools).
 *
 * Why: on a commerce bot a returns/contact/hours question carried the whole
 * commerce prompt and could wander into a needless search_products round trip
 * (12–14s observed for a gift-card question — which IS a product by design,
 * so it stays in the full lane).
 *
 * The model is NOT swapped: measured 2026-09-02, gpt-4.1 reached the first
 * token in ~0.6–0.9s vs ~0.9–1.4s for gpt-4.1-mini and ~1.0–2.0s for
 * gpt-4.1-nano on the same prompt. Smaller ≠ faster here.
 *
 * Per-bot flag `config.fastLane`, default off — see the 2026-09-02 spec.
 */

/** Top cosine similarity a KB hit needs before we trust it enough to skip the
 *  big model and tools. Observed on the HomeByNB copy: returns 0.55, payment
 *  0.60, delivery 0.45, Lithuanian returns 0.41; incidental noise sits below 0.3. */
export const FAST_LANE_SIMILARITY = 0.4

// Anything a commerce tool owns stays in the full lane: products, gift cards,
// vouchers (search_products); delivery (shipping_info); orders (order_status);
// discounts (discount_code). Stems, not words, so Lithuanian inflections match.
// ponytail: one regex, errs toward the full lane; a classifier call would cost
// the latency we are trying to save.
const TOOL_INTENT =
  /\b(price|cost|buy|order|purchase|cheap|expensive|gift|voucher|coupon|discount|promo|deliver|shipping|ship\b|courier|parcel|track|stock|availab|recommend|show me|looking for|do you have|have you got|do you sell|kain|pirk|užsak|uzsak|dovan|kupon|nuolaid|akcij|pristat|siunt|kurjer|paštomat|pastomat|sekim|turite|turit|siūl|siul|rekomend|parod|iešk|iesk|pigiau|brangiau)/i

export type Lane = 'fast' | 'full'

export function pickLane(
  config: BotConfig,
  message: string,
  topSimilarity: number,
  shownProducts?: ShownProducts,
): Lane {
  if (!config.fastLane) return 'full'
  if (topSimilarity < FAST_LANE_SIMILARITY) return 'full'
  // No store → nothing to skip; the prompt is already the plain KB one.
  if (!storeConfigured(config.commerce)) return 'fast'
  // "The first one" refers to cards on screen — needs display_products.
  if (shownProducts?.length) return 'full'
  if (TOOL_INTENT.test(message)) return 'full'
  return 'fast'
}

/** Prompt config for the fast lane: the plain knowledge-base prompt, without
 *  the tool instructions ("you MUST call search_products") the lane has no
 *  tools for. */
export function fastLaneConfig(config: BotConfig): BotConfig {
  return { ...config, commerce: { ...config.commerce, enabled: false } }
}
