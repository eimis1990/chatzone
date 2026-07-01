import { storeOrigin, decodeEntities } from '@/lib/commerce/woocommerce'

// Bound a single sync so it fits the function time budget; the most popular
// products come first (orderby=popularity), so the cap keeps what matters most.
const MAX_PRODUCTS = 300
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
}

/** Fetch the WooCommerce catalog via the public Store API, most-popular first. */
export async function fetchWooCatalog(
  storeUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RawProduct[]> {
  const base = storeOrigin(storeUrl)
  const out: RawProduct[] = []
  for (let page = 1; out.length < MAX_PRODUCTS; page++) {
    const res = await fetchImpl(
      `${base}/wp-json/wc/store/v1/products?per_page=${PER_PAGE}&page=${page}&orderby=popularity&order=desc`,
    )
    if (!res.ok) break
    const rows = (await res.json()) as WooCatalogItem[]
    if (!Array.isArray(rows) || rows.length === 0) break
    for (const p of rows) {
      out.push({
        id: String(p.id),
        title: decodeEntities(p.name ?? ''),
        url: p.permalink ?? '',
        imageUrl: p.images?.[0]?.src ?? p.images?.[0]?.thumbnail,
        description: stripHtml(p.short_description) || stripHtml(p.description),
        categories: (p.categories ?? []).map((c) => decodeEntities(c.name ?? '')).filter(Boolean),
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

/** The text embedded for semantic search (title + audience + categories + tags + summary). */
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
  if (p.description) parts.push(p.description.slice(0, 500))
  return parts.join('\n')
}
