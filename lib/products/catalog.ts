import { storeOrigin, decodeEntities } from '@/lib/commerce/woocommerce'

// Index the bulk of the catalog so the semantic search can find ANY relevant
// product (e.g. a candle for a gift), not just the top sellers. Most-popular
// first (orderby=popularity), so if a very large store exceeds the cap, the cap
// still keeps what matters most. Enrichment is parallelized to fit the budget.
const MAX_PRODUCTS = 3000
const PER_PAGE = 100
const TOP_SELLER_RANK = 20

/** Who a product is intended for. 'unisex' matches every audience at search time. */
export type Audience = 'women' | 'men' | 'kids' | 'unisex'

/** A catalog product, provider-normalized, ready for tagging + embedding. */
export interface RawProduct {
  id: string
  title: string
  url: string
  imageUrl?: string
  description: string
  categories: string[]
  /** Display attributes, one line per attribute: "Spalva: raudona, mėlyna". */
  attributes: string[]
  onSale: boolean
  featured: boolean
  /** 0-based popularity rank (lower = more popular). */
  rank: number
}

function stripHtml(html?: string): string {
  if (!html) return ''
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

interface WooCatalogItem {
  id: number
  name?: string
  permalink?: string
  short_description?: string
  description?: string
  on_sale?: boolean
  featured?: boolean
  images?: Array<{ src?: string; thumbnail?: string }>
  categories?: Array<{ name?: string }>
  attributes?: Array<{ name?: string; terms?: Array<{ name?: string }> }>
}

/** Fetch the WooCommerce catalog via the public Store API, most-popular first. */
export async function fetchWooCatalog(
  storeUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RawProduct[]> {
  const base = storeOrigin(storeUrl)
  const out: RawProduct[] = []
  // Popularity ordering can shift between page fetches, so the same product may
  // appear on two pages — dedupe or the index insert hits its unique constraint.
  const seen = new Set<string>()
  for (let page = 1; out.length < MAX_PRODUCTS; page++) {
    const res = await fetchImpl(
      `${base}/wp-json/wc/store/v1/products?per_page=${PER_PAGE}&page=${page}&orderby=popularity&order=desc`,
    )
    if (!res.ok) break
    const rows = (await res.json()) as WooCatalogItem[]
    if (!Array.isArray(rows) || rows.length === 0) break
    for (const p of rows) {
      const id = String(p.id)
      if (seen.has(id)) continue
      seen.add(id)
      out.push({
        id,
        title: decodeEntities(p.name ?? ''),
        url: p.permalink ?? '',
        imageUrl: p.images?.[0]?.src ?? p.images?.[0]?.thumbnail,
        description: stripHtml(p.short_description) || stripHtml(p.description),
        categories: (p.categories ?? []).map((c) => decodeEntities(c.name ?? '')).filter(Boolean),
        attributes: (p.attributes ?? [])
          .map((a) => {
            const name = decodeEntities(a.name ?? '')
            const terms = (a.terms ?? []).map((t) => decodeEntities(t.name ?? '')).filter(Boolean)
            return name && terms.length ? `${name}: ${terms.join(', ')}` : ''
          })
          .filter(Boolean)
          .slice(0, 8),
        onSale: Boolean(p.on_sale),
        featured: Boolean(p.featured),
        rank: out.length,
      })
      if (out.length >= MAX_PRODUCTS) break
    }
    if (rows.length < PER_PAGE) break
  }
  return out
}

/** Tags derived purely from store data — free, always accurate. */
export function deriveTags(p: RawProduct): string[] {
  const tags = [...p.categories]
  if (p.featured) tags.push('featured')
  if (p.onSale) tags.push('on sale', 'discounted')
  if (p.rank < TOP_SELLER_RANK) tags.push('top seller', 'popular', 'best-selling')
  return tags
}

// Recipient signals in category names (Lithuanian + English). Order matters:
// kids-only tokens are checked apart from adult gender so a "gift for men"
// search never returns children's items.
const KIDS_RE = /vaik|kūdik|kudik|berniuk|mergait|\bkids?\b|\bchild|\bbaby\b|toddler|\bboys?\b|\bgirls?\b/i
const WOMEN_RE = /moter|mamai|\bmama\b|mergin|\bwom[ae]n\b|ladies|\bher\b|\bshe\b|female/i
const MEN_RE = /vyr|tėčiui|tetis|tėtis|\bmen\b|\bman\b|\bhim\b|\bhis\b|\bdads?\b|male\b/i

/**
 * Best-effort audience from category names alone. Explicit store categories are
 * highly reliable; ambiguous/absent signals return null so the AI classifier can
 * decide. A product tagged for BOTH genders is treated as unisex.
 */
export function deriveAudience(categories: string[]): Audience | null {
  const cat = categories.join(' ')
  const kids = KIDS_RE.test(cat)
  const women = WOMEN_RE.test(cat)
  const men = MEN_RE.test(cat)
  if (women && men) return 'unisex'
  if (kids && !women && !men) return 'kids'
  if (women) return 'women'
  if (men) return 'men'
  if (kids) return 'kids'
  return null
}

/** The text embedded for semantic search (title + audience + categories + tags + attributes + summary). */
export function buildDoc(p: RawProduct, tags: string[], audience?: Audience): string {
  const parts = [p.title]
  if (audience && audience !== 'unisex') {
    // A natural recipient line so the embedding itself leans toward the right person.
    const label = { women: 'women', men: 'men', kids: 'children' }[audience]
    parts.push(`Intended for: ${label}. A good gift for ${label}.`)
  }
  if (p.categories.length) parts.push('Categories: ' + p.categories.join(', '))
  const uniq = [...new Set(tags)]
  if (uniq.length) parts.push('Tags: ' + uniq.join(', '))
  // Store attributes (color, scent, size, material…) let descriptive queries
  // ("kvapni žvakė vanilės kvapo") match products whose titles don't say it.
  if (p.attributes.length) parts.push('Attributes: ' + p.attributes.join('; '))
  if (p.description) parts.push(p.description.slice(0, 500))
  return parts.join('\n')
}
