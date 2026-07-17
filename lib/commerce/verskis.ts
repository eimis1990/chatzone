import type {
  CommerceDeps,
  CommerceProduct,
  ProductDetails,
  ProductSearchParams,
} from '@/lib/commerce/types'
import { decodeEntities, storeOrigin, STOREFRONT_HEADERS } from '@/lib/commerce/woocommerce'

const HTML_HEADERS: Record<string, string> = {
  ...STOREFRONT_HEADERS,
  Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
}

function stripHtml(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))
  return match ? decodeEntities(match[1]) : ''
}

function absoluteUrl(value: string, base: string): string {
  try {
    return new URL(value, base).toString()
  } catch {
    return value
  }
}

function numericPrice(price: string): number | undefined {
  const compact = price.replace(/\s/g, '').replace(/[^\d,.]/g, '')
  if (!compact) return undefined
  const decimal = compact.lastIndexOf(',') > compact.lastIndexOf('.') ? ',' : '.'
  const normalized = compact.replace(decimal === ',' ? /\./g : /,/g, '').replace(decimal, '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : undefined
}

/** True when the storefront identifies itself as the Verskis hosted platform. */
export function isVerskisHtml(html: string): boolean {
  return (html.match(/<meta\b[^>]*>/gi) ?? []).some(
    (tag) =>
      attr(tag, 'name').toLowerCase() === 'generator' &&
      attr(tag, 'content').toLowerCase() === 'verskis',
  )
}

/** Discover the localized search form instead of assuming Lithuanian `/paieska`. */
export function verskisSearchUrl(html: string, base: string): string | undefined {
  const forms = html.match(/<form\b[^>]*>/gi) ?? []
  const form = forms.find((tag) => /\bproduct-suggestion-search\b/i.test(attr(tag, 'class')))
  const action = form ? attr(form, 'action') : ''
  if (!action) return undefined
  const url = absoluteUrl(action, base)
  try {
    return new URL(url).origin === new URL(base).origin ? url : undefined
  } catch {
    return undefined
  }
}

/** Parse Verskis product-list cards from search/category HTML. */
export function parseVerskisProducts(html: string, base: string): CommerceProduct[] {
  const matches = [...html.matchAll(/<div\b[^>]*>/gi)].filter(
    (match) => /\bproduct-item\b/i.test(attr(match[0], 'class')) && attr(match[0], 'data-pid'),
  )
  const products: CommerceProduct[] = []

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0
    const end = matches[i + 1]?.index ?? html.length
    const chunk = html.slice(start, end)
    const titleTag = chunk.match(/<a\b[^>]*class=["'][^"']*\bitem-title\b[^"']*["'][^>]*>/i)?.[0]
    const imageTag = chunk.match(/<img\b[^>]*class=["'][^"']*\bitem_image_[^"']*["'][^>]*>/i)?.[0]
    const priceHtml = chunk.match(
      /<strong\b[^>]*class=["'][^"']*\bprice\b[^"']*["'][^>]*>([\s\S]*?)<\/strong>/i,
    )?.[1]
    if (!titleTag || !priceHtml) continue

    const url = absoluteUrl(attr(titleTag, 'href'), base)
    const title =
      attr(titleTag, 'title') ||
      stripHtml(chunk.match(/<a\b[^>]*\bitem-title\b[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '')
    if (!title || !url) continue

    const attributes: string[] = []
    const attributePattern = /data-attribute-name=["']([^"']+)["'][^>]*data-attribute-values='([^']*)'/gi
    for (const match of chunk.matchAll(attributePattern)) {
      const name = decodeEntities(match[1]).trim()
      let values: string[] = []
      try {
        const parsed = JSON.parse(decodeEntities(match[2])) as unknown
        if (Array.isArray(parsed)) values = parsed.map(String).filter(Boolean)
      } catch {
        values = [stripHtml(match[2])].filter(Boolean)
      }
      if (name && values.length) attributes.push(`${name}: ${values.join(', ')}`)
      if (attributes.length >= 4) break
    }

    const price = stripHtml(priceHtml).replace(/^(Kaina|Price|Цена)\s*/i, '').trim()
    const image = imageTag ? attr(imageTag, 'src') : ''
    products.push({
      // Keep the model-facing id opaque. Exposing `url` as the id made models
      // print Markdown hyperlinks instead of calling display_products. The
      // commerce tool resolves this id back to the card URL for detail fetches.
      id: attr(matches[i][0], 'data-pid'),
      title,
      price,
      url,
      imageUrl: image ? absoluteUrl(image, base) : undefined,
      // Verskis keeps a legacy `soldout` CSS class even on products whose
      // Product JSON-LD says InStock. Only explicit shopper-facing labels are
      // reliable enough to mark an item unavailable.
      inStock: !/\b(Išparduota|Out of stock|Нет в наличии)\b/i.test(stripHtml(chunk)),
      shortDescription: attributes.length ? attributes.join(' · ') : undefined,
    })
  }

  return products
}

interface VerskisJsonLdProduct {
  '@type'?: string
  productID?: string | number
  name?: string
  description?: string
  image?: string | string[]
  brand?: string | { name?: string }
  offers?: {
    price?: string | number
    priceCurrency?: string
    availability?: string
    url?: string
  }
}

interface VerskisJsonLdBreadcrumbs {
  '@type'?: string
  itemListElement?: Array<{ item?: { name?: string } }>
}

function jsonLdProduct(html: string): VerskisJsonLdProduct | undefined {
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(match[1]) as VerskisJsonLdProduct
      if (parsed?.['@type'] === 'Product') return parsed
    } catch {
      // Ignore unrelated malformed structured data and keep looking.
    }
  }
  return undefined
}

function jsonLdBreadcrumbs(html: string): string[] {
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(match[1]) as VerskisJsonLdBreadcrumbs
      if (parsed?.['@type'] !== 'BreadcrumbList') continue
      return (parsed.itemListElement ?? [])
        .map((item) => decodeEntities(item.item?.name ?? '').trim())
        .filter(Boolean)
    } catch {
      // Keep looking for the breadcrumb structured-data block.
    }
  }
  return []
}

function mainProductAttributes(html: string): string[] {
  const attributes: string[] = []
  // Product pages append `alternative_goods` and `related_goods` cards whose
  // attributes reuse the same data-* fields. Restrict parsing to the main
  // product's "Savybės" table or a recommendation's dimensions/color could be
  // mistaken for the product being inspected.
  const tableStart = html.search(/<div\b[^>]*class=["'][^"']*\battributes\b[^"']*\bmt10\b[^"']*["']/i)
  const alternativesStart =
    tableStart >= 0 ? html.slice(tableStart).search(/<div\b[^>]*id=["']alternative_goods["']/i) : -1
  const tableHtml =
    tableStart < 0
      ? ''
      : html.slice(
          tableStart,
          alternativesStart >= 0 ? tableStart + alternativesStart : html.length,
        )
  const pattern = /data-attribute-name=["']([^"']+)["'][^>]*data-attribute-values='([^']*)'/gi
  for (const match of tableHtml.matchAll(pattern)) {
    const name = decodeEntities(match[1]).trim()
    let values: string[] = []
    try {
      const parsed = JSON.parse(decodeEntities(match[2])) as unknown
      if (Array.isArray(parsed)) values = parsed.map(String).map((v) => v.trim()).filter(Boolean)
    } catch {
      values = [stripHtml(match[2])].filter(Boolean)
    }
    if (name && values.length) attributes.push(`${name}: ${values.join(', ')}`)
    if (attributes.length >= 40) break
  }
  return attributes
}

function mainProductPrice(html: string): string | number | undefined {
  // Configurable Verskis products can omit `offers.price` from Product JSON-LD
  // even though the shopper-facing page has a current base price. Read only the
  // main price element, before recommendation blocks, as the live fallback.
  const alternativesStart = html.search(/<div\b[^>]*id=["']alternative_goods["']/i)
  const mainHtml = alternativesStart >= 0 ? html.slice(0, alternativesStart) : html
  const priceTag = (mainHtml.match(
    /<strong\b[^>]*class=["'][^"']*\bprice\b[^"']*["'][^>]*>/i,
  ) ?? [])[0]
  if (!priceTag) return undefined
  return attr(priceTag, 'data-pricenew') || attr(priceTag, 'data-price-human') || undefined
}

/** Structured product data shared by bulk catalog sync and live hydration. */
export interface VerskisPageProduct {
  id: string
  title: string
  url: string
  imageUrl?: string
  description: string
  categories: string[]
  attributes: string[]
  price?: string | number
  currency?: string
  inStock: boolean
}

export function parseVerskisPageProduct(
  html: string,
  fallbackUrl: string,
): VerskisPageProduct | undefined {
  const product = jsonLdProduct(html)
  const id = String(product?.productID ?? '').trim()
  const title = decodeEntities(product?.name ?? '').trim()
  if (!product || !id || !title) return undefined

  const offer = product.offers
  const url = absoluteUrl(offer?.url || fallbackUrl, fallbackUrl)
  const images = Array.isArray(product.image) ? product.image : [product.image]
  const attributes = mainProductAttributes(html)
  const brand =
    typeof product.brand === 'string' ? product.brand : product.brand?.name
  if (brand?.trim() && !attributes.some((line) => /^Prekės ženklas:/i.test(line))) {
    attributes.push(`Prekės ženklas: ${decodeEntities(brand).trim()}`)
  }
  const crumbs = jsonLdBreadcrumbs(html)
  const categories = crumbs.filter(
    (name, index) => index > 0 && name.toLocaleLowerCase('lt-LT') !== title.toLocaleLowerCase('lt-LT'),
  )

  return {
    id,
    title,
    url,
    imageUrl: images.find((image): image is string => Boolean(image)),
    description: stripHtml(product.description ?? ''),
    categories,
    attributes,
    price: offer?.price ?? mainProductPrice(html),
    currency: offer?.priceCurrency,
    inStock: !offer?.availability || /\/InStock$/i.test(offer.availability),
  }
}

/** Parse the full attribute table and description from a Verskis product page. */
export function parseVerskisProductDetails(html: string, id: string): ProductDetails | undefined {
  const product = parseVerskisPageProduct(html, id)
  if (!product) return undefined
  const description = product.description
  return {
    id,
    title: product.title,
    description: description ? description.slice(0, 1500) : undefined,
    attributes: product.attributes.length ? product.attributes : undefined,
  }
}

function formattedPrice(price: string | number | undefined, currency = 'EUR'): string {
  const value = Number(price)
  if (!Number.isFinite(value)) return ''
  const symbol = currency.toUpperCase() === 'EUR' ? '€' : currency.toUpperCase()
  return `${value.toFixed(2)} ${symbol}`
}

/** Hydrate semantic Verskis matches from their live product pages. */
export async function fetchVerskisProductsByRefs(
  storeUrl: string,
  refs: Array<{ id: string; url: string }>,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const origin = new URL(storeOrigin(storeUrl)).origin
  // Provider profile normally requests 32 rows to absorb stale/unparseable
  // pages before trimming to 20-24 live products. Keep a defensive ceiling so
  // an accidental huge request cannot crawl an entire category at chat time.
  const safeRefs = refs.slice(0, 60).filter((ref) => {
    try {
      return new URL(ref.url).origin === origin
    } catch {
      return false
    }
  })
  const rows: Array<CommerceProduct | undefined> = new Array(safeRefs.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < safeRefs.length) {
      const index = next++
      const ref = safeRefs[index]
      try {
        let res = await fetchImpl(ref.url, { headers: HTML_HEADERS })
        if (!res.ok) res = await fetchImpl(ref.url, { headers: HTML_HEADERS })
        if (!res.ok) continue
        const product = parseVerskisPageProduct(await res.text(), ref.url)
        if (!product) continue
        const price = formattedPrice(product.price, product.currency)
        if (!price) continue
        rows[index] = {
          id: ref.id,
          title: product.title,
          price,
          url: product.url,
          imageUrl: product.imageUrl,
          inStock: product.inStock,
          shortDescription: product.attributes.slice(0, 4).join(' · ') || undefined,
        } satisfies CommerceProduct
      } catch {
        // One stale or temporarily unreachable page must not fail the result set.
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(8, safeRefs.length) }, worker),
  )
  return rows.filter((row): row is CommerceProduct => row !== undefined)
}

export function parseVerskisTotal(html: string): number {
  const total = Number(
    html.match(/class=["'][^"']*\bresults_total\b[^"']*["'][^>]*>\s*([\d\s.,]+)/i)?.[1].replace(/\D/g, '') ?? 0,
  )
  return Number.isFinite(total) ? total : 0
}

async function discover(storeUrl: string, fetchImpl: typeof fetch) {
  const base = storeOrigin(storeUrl)
  const res = await fetchImpl(base, { headers: HTML_HEADERS })
  if (!res.ok) throw new Error(`Verskis storefront failed: HTTP ${res.status}`)
  const html = await res.text()
  if (!isVerskisHtml(html)) throw new Error('Store is not a Verskis storefront')
  const searchUrl = verskisSearchUrl(html, base)
  if (!searchUrl) throw new Error('Verskis search form was not found')
  return { base, searchUrl }
}

/** Live keyword search through the public Verskis storefront search page. */
export async function searchVerskisProducts(
  storeUrl: string,
  params: ProductSearchParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const { base, searchUrl } = await discover(storeUrl, fetchImpl)
  const url = new URL(searchUrl)
  url.searchParams.set('q', params.query)
  const res = await fetchImpl(url, { headers: HTML_HEADERS })
  if (!res.ok) throw new Error(`Verskis search failed: HTTP ${res.status}`)
  const html = await res.text()
  let products = parseVerskisProducts(html, base)
  // Search pages may append recommendation carousels after the actual results.
  // Never leak those unrelated cards into the candidate set.
  const resultTotal = parseVerskisTotal(html)
  const hasResultTotal = /class=["'][^"']*\bresults_total\b/i.test(html)
  if (hasResultTotal) products = products.slice(0, resultTotal)
  if (params.minPrice != null) {
    products = products.filter((p) => (numericPrice(p.price) ?? -Infinity) >= params.minPrice!)
  }
  if (params.maxPrice != null) {
    products = products.filter((p) => (numericPrice(p.price) ?? Infinity) <= params.maxPrice!)
  }
  products = products.slice(0, Math.min(params.limit ?? 6, 12))

  // Verskis search indexes titles but usually omits filter-critical attributes
  // such as color and dimensions from its cards. Fetch the selected result
  // pages concurrently once and attach compact model-only details. This turns a
  // multi-step agent scan into one catalog search. Cards still render only
  // shortDescription.
  return Promise.all(
    products.map(async (product) => {
      try {
        const detailRes = await fetchImpl(product.url, { headers: HTML_HEADERS })
        if (!detailRes.ok) return product
        const detail = parseVerskisProductDetails(await detailRes.text(), product.id)
        if (!detail) return product
        const detailText = [
          detail.attributes?.length ? `Attributes:\n${detail.attributes.join('\n')}` : '',
          detail.description ? `Description: ${detail.description.slice(0, 600)}` : '',
        ]
          .filter(Boolean)
          .join('\n')
        return detailText ? { ...product, details: detailText } : product
      } catch {
        // A single detail page must not make the whole search unavailable.
        return product
      }
    }),
  )
}

/** Fetch full live details for Verskis products, whose ids are product URLs. */
export async function fetchVerskisProductDetails(
  storeUrl: string,
  ids: string[],
  deps: CommerceDeps = {},
): Promise<ProductDetails[]> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const base = storeOrigin(storeUrl)
  const origin = new URL(base).origin
  const urls = [...new Set(ids)].slice(0, 3).filter((id) => {
    try {
      return new URL(id).origin === origin
    } catch {
      return false
    }
  })

  const details = await Promise.all(
    urls.map(async (url) => {
      const res = await fetchImpl(url, { headers: HTML_HEADERS })
      if (!res.ok) return undefined
      return parseVerskisProductDetails(await res.text(), url)
    }),
  )
  return details.filter((detail): detail is ProductDetails => Boolean(detail))
}

/** List cards from a Verskis category/search URL on the configured store. */
export async function listVerskisProductsByUrl(
  storeUrl: string,
  pageUrl: string,
  limit: number,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const base = storeOrigin(storeUrl)
  let url: URL
  try {
    url = new URL(pageUrl)
    if (url.origin !== new URL(base).origin) return []
  } catch {
    return []
  }
  const res = await fetchImpl(url, { headers: HTML_HEADERS })
  if (!res.ok) return []
  return parseVerskisProducts(await res.text(), base).slice(0, Math.min(limit, 24))
}

function xmlLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) =>
    decodeEntities(m[1]).trim(),
  )
}

/** Discover every same-origin product URL advertised by Verskis product sitemaps. */
export async function fetchVerskisProductUrls(
  storeUrl: string,
  deps: CommerceDeps = {},
): Promise<string[]> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const { base } = await discover(storeUrl, fetchImpl)
  const sitemapRes = await fetchImpl(`${base}/sitemap.xml`, { headers: HTML_HEADERS })
  if (!sitemapRes.ok) return []
  const sitemap = await sitemapRes.text()
  const origin = new URL(base).origin
  const productMaps = xmlLocations(sitemap)
    .filter((value) => {
      try {
        const url = new URL(value)
        return url.origin === origin && /\/products\.xml$/i.test(url.pathname)
      } catch {
        return false
      }
    })
    .slice(0, 10)
  if (!productMaps.length) return []

  const pages = await Promise.all(
    productMaps.map(async (url) => {
      const res = await fetchImpl(url, { headers: HTML_HEADERS })
      if (!res.ok) throw new Error(`Verskis product sitemap failed: HTTP ${res.status}`)
      return xmlLocations(await res.text()).filter((value) => {
        try {
          return new URL(value).origin === origin
        } catch {
          return false
        }
      })
    }),
  )
  return [...new Set(pages.flat())]
}

/** Validate Verskis and count products from its public product sitemap(s). */
export async function validateVerskisStore(
  storeUrl: string,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; total: number }> {
  const fetchImpl = deps.fetchImpl ?? fetch
  try {
    const urls = await fetchVerskisProductUrls(storeUrl, { fetchImpl })
    return { ok: true, total: urls.length }
  } catch {
    return { ok: false, total: 0 }
  }
}
