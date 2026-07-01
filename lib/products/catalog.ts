import { storeOrigin, decodeEntities } from '@/lib/commerce/woocommerce'

// Bound a single sync so it fits the function time budget; the most popular
// products come first (orderby=popularity), so the cap keeps what matters most.
const MAX_PRODUCTS = 300
const PER_PAGE = 100
const TOP_SELLER_RANK = 20

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

/** The text embedded for semantic search (title + categories + tags + summary). */
export function buildDoc(p: RawProduct, tags: string[]): string {
  const parts = [p.title]
  if (p.categories.length) parts.push('Categories: ' + p.categories.join(', '))
  const uniq = [...new Set(tags)]
  if (uniq.length) parts.push('Tags: ' + uniq.join(', '))
  if (p.description) parts.push(p.description.slice(0, 500))
  return parts.join('\n')
}
