import { fetchVerskisProductsByRefs } from '@/lib/commerce/verskis'
import { storeOrigin } from '@/lib/commerce/woocommerce'
import { fetchVerskisCatalog } from '@/lib/products/catalog'
import type { CommerceProduct } from '@/lib/commerce/types'
import type { CompleteDisplaySelectionInput } from './types'
import type { CommerceProviderProfile } from './types'

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
}

function words(value: string): string[] {
  return fold(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

function normalizeVerskisSemanticQuery(query: string): string {
  const queryWords = words(query)
  const asksForSofaBed = queryWords.includes('sofa') && queryWords.includes('lova')
  if (!asksForSofaBed) return query

  // On furniture catalogs a shopper/model may call a sleeper sofa `sofa-lova`,
  // while products are titled simply `Sofa` and expose the capability as the
  // structured `Miegojimo funkcija` attribute. Preserve any other qualifiers.
  const withoutBedNoun = queryWords.filter((word) => word !== 'lova')
  return [...withoutBedNoun, 'miegojimo', 'funkcija'].join(' ')
}

function titleFamily(product: CommerceProduct): string {
  return words(product.title)[0] ?? ''
}

function attributes(product: CommerceProduct): Map<string, string> {
  const line = product.details?.match(/(?:^|\n)Attributes:\s*([^\n]+)/)?.[1]
  const out = new Map<string, string>()
  for (const field of line?.split(';') ?? []) {
    const separator = field.indexOf(':')
    if (separator < 1) continue
    const label = fold(field.slice(0, separator).trim())
    const value = fold(field.slice(separator + 1).trim())
    if (label && value) out.set(label, value)
  }
  return out
}

function relatedToQuery(label: string, value: string, queryWords: string[]): boolean {
  const fieldWords = [...words(label), ...words(value)]
  if (
    queryWords.some((queryWord) =>
      fieldWords.some((fieldWord) =>
        queryWord.length >= 4 && fieldWord.length >= 4
          ? queryWord.slice(0, 4) === fieldWord.slice(0, 4)
          : queryWord === fieldWord,
      ),
    )
  ) {
    return true
  }

  // Common storefront vocabulary where the shopper's product noun expresses
  // a function rather than repeating the catalog's attribute label.
  const asksForBedFunction = queryWords.some((word) =>
    ['lova', 'lovos', 'mieg', 'sleep', 'sleeper', 'bed'].some((term) => word.startsWith(term)),
  )
  return asksForBedFunction && /^(mieg|sleep)/.test(label)
}

interface AttributeConstraint {
  label: string
  exactValue?: string
  commonTokens?: string[]
}

function sharedQueryConstraints(
  selected: CommerceProduct[],
  queryWords: string[],
): AttributeConstraint[] {
  const parsed = selected.map(attributes)
  if (!parsed.length) return []
  const labels = [...parsed[0].keys()].filter((label) =>
    parsed.every((item) => item.has(label)),
  )

  return labels.flatMap((label): AttributeConstraint[] => {
    const values = parsed.map((item) => item.get(label)!)
    if (!relatedToQuery(label, values.join(' '), queryWords)) return []
    if (values.every((value) => value === values[0])) {
      return [{ label, exactValue: values[0] }]
    }
    const commonTokens = words(values[0]).filter(
      (token) => token.length >= 4 && values.every((value) => words(value).includes(token)),
    )
    return commonTokens.length ? [{ label, commonTokens }] : []
  })
}

function matchesConstraint(product: CommerceProduct, constraint: AttributeConstraint): boolean {
  const value = attributes(product).get(constraint.label)
  if (!value) return false
  if (constraint.exactValue) return value === constraint.exactValue
  return constraint.commonTokens?.every((token) => words(value).includes(token)) ?? false
}

function completeVerskisBrowseSelection({
  query,
  selected,
  rankedCandidates,
  limit,
}: CompleteDisplaySelectionInput): CommerceProduct[] {
  const queryWords = words(query)
  // Numeric/range queries are tight fit requests, not browse-all requests.
  if (!queryWords.length || queryWords.some((word) => /\d/.test(word))) {
    return selected.slice(0, limit)
  }

  const rankedFamilies = [...new Set(rankedCandidates.map(titleFamily).filter(Boolean))]
  const namedFamily = rankedFamilies.find((family) =>
    queryWords.some((word) => word.slice(0, 4) === family.slice(0, 4)),
  )
  const selectedFamily = titleFamily(selected[0])
  const family = namedFamily ||
    (selectedFamily && selected.every((product) => titleFamily(product) === selectedFamily)
      ? selectedFamily
      : '')
  if (!family) return selected.slice(0, limit)

  // A model may select every item sharing an attribute and accidentally mix
  // categories (for example sleeper sofas and sleeper corner sofas). When the
  // query names a title family, that category remains a hard constraint.
  const inFamily = selected.filter((product) => titleFamily(product) === family)
  if (inFamily.length < 2) return inFamily.length ? inFamily : selected.slice(0, limit)
  if (inFamily.length >= limit) return inFamily.slice(0, limit)

  const constraints = sharedQueryConstraints(inFamily, queryWords)
  const queryOnlyNamesFamily = queryWords.every((word) =>
    word.slice(0, 4) === family.slice(0, 4),
  )
  if (!constraints.length && !queryOnlyNamesFamily) return inFamily

  const completed = rankedCandidates.filter(
    (product) =>
      titleFamily(product) === family &&
      constraints.every((constraint) => matchesConstraint(product, constraint)),
  )
  return completed.length > inFamily.length ? completed.slice(0, limit) : inFamily
}

export const verskisProductSearchProfile: CommerceProviderProfile = {
  provider: 'verskis',
  // Verskis exposes structured attributes in the synced doc. Sending the first
  // 20 compact docs lets the model verify a full browse page without increasing
  // the neutral providers' token budget.
  candidateDetailsLimit: 20,
  catalogSync: {
    configured: (config) => Boolean(config.storeUrl),
    fetch: (config, onFetched) => fetchVerskisCatalog(config.storeUrl, fetch, onFetched),
    skipAiEnrichment: true,
  },
  productDetailsReference: (product) => product.url,
  queryGuidance:
    'For this Verskis catalog, express hard attribute values in the catalog\'s ' +
    'canonical form rather than copying an inflected conversational phrase. Keep the product ' +
    'type and actual attribute value; omit filler words such as "color" when possible.',
  displayGuidance:
    'For a category browse, including a category plus one simple attribute such as color or ' +
    'function, display exactly min(20, the number of verified matching candidates). If at least 20 ' +
    'verified matches are available, pass exactly 20 ids; do not stop at 4-15. The first 4 are only ' +
    'preview cards and the rest remain available behind the full-results list.',
  completeDisplaySelection: completeVerskisBrowseSelection,
  semantic: {
    matcherRpc: 'match_products_verskis',
    configured: (config) => Boolean(config.storeUrl),
    normalizeQuery: normalizeVerskisSemanticQuery,
    // Some indexed pages disappear or fail live parsing between syncs. A small
    // fixed headroom reliably fills a 20-card list without fetching an entire
    // 50-500 item category.
    candidatePoolSize: (requestedLimit) => Math.min(60, Math.max(32, requestedLimit)),
    hydrate: async (config, matches) => {
      const refs = matches
        .filter((match): match is typeof match & { url: string } => Boolean(match.url))
        .map((match) => ({ id: match.external_id, url: match.url }))
      const products = await fetchVerskisProductsByRefs(config.storeUrl, refs)
      return new Map(products.map((product) => [product.id, product]))
    },
    acceptsIndex: (config, matches) => {
      const origin = storeOrigin(config.storeUrl)
      return matches.some((match) => {
        try {
          return Boolean(match.url) && new URL(match.url!).origin === origin
        } catch {
          return false
        }
      })
    },
  },
}
