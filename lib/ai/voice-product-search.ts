import type { CommerceProduct } from '@/lib/commerce/types'

/**
 * ElevenLabs client tools can only return scalar values, so candidate data is
 * serialized into a compact string for the voice LLM to review before it calls
 * `display_products`. Product cards remain in the browser and are not shown by
 * the search step itself.
 */
export function voiceProductCandidateSummary(
  products: CommerceProduct[],
  candidateDetailsLimit: number,
): string {
  const candidates = products.map((product, index) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    inStock: product.inStock,
    description: product.shortDescription?.slice(0, 140),
    details: index < candidateDetailsLimit ? product.details : undefined,
  }))

  return [
    `Found ${products.length} candidate products. They are NOT shown to the shopper yet.`,
    'Review every active hard constraint against the structured candidate facts below. Missing facts are unverified, not matches.',
    JSON.stringify(candidates),
    'Call display_products once with only the verified matching ids, best first. If none can be verified, do not display weak alternatives.',
  ].join('\n')
}

/**
 * ElevenLabs client-tool parameters are scalar, so `display_products` sends
 * the selected ids as a JSON-encoded string. Accept the former array shape and
 * a simple comma/newline fallback too, so an in-flight/stale agent cannot break
 * card rendering during a deployment.
 */
export function parseVoiceProductIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.trim())
      .filter(Boolean)
  }
  if (typeof value !== 'string' || !value.trim()) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim())
        .filter(Boolean)
    }
  } catch {
    // Be tolerant of a model returning a plain comma/newline-delimited list.
  }

  return value
    .split(/[,\n]+/)
    .map((id) => id.trim().replace(/^\[?["']?|["']?\]?$/g, ''))
    .filter(Boolean)
}

/** Resolve a voice model's display ids strictly against its latest search. */
export function selectVoiceProductCandidates(
  candidates: ReadonlyMap<string, CommerceProduct>,
  productIds: string[],
  limit = 20,
): CommerceProduct[] {
  const seen = new Set<string>()
  return productIds
    .filter((id) => !seen.has(id) && (seen.add(id), true))
    .map((id) => candidates.get(id))
    .filter((product): product is CommerceProduct => Boolean(product))
    .slice(0, limit)
}
