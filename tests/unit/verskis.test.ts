import { describe, expect, it, vi } from 'vitest'
import {
  fetchVerskisProductDetails,
  fetchVerskisProductsByRefs,
  isVerskisHtml,
  parseVerskisPageProduct,
  parseVerskisProductDetails,
  parseVerskisProducts,
  parseVerskisTotal,
  searchVerskisProducts,
  validateVerskisStore,
  verskisSearchUrl,
} from '@/lib/commerce/verskis'
import {
  getProductDetails,
  productDetailsSupported,
  searchStore,
  storeConfigured,
  validateStore,
} from '@/lib/commerce'
import { semanticIndexSupported } from '@/lib/products/search'

const HOME = `
  <html><head><meta content="Verskis" name="generator"></head><body>
  <form class="product-suggestion-search" action="https://shop.test/paieska" method="get"></form>
  </body></html>`

const RESULTS = `
  <div>Rasta prekių: <span class="results_total">808</span></div>
  <div class="grid product product-item item-list" data-pid="49967">
    <a class="item-image"><img src="/images/chair.jpg" alt="Kėdė" class="vv item_image_49967"></a>
    <a class="item-title" href="https://shop.test/kede-k05210" title="Kėdė K05210"><span>Kėdė K05210</span></a>
    <div class="attribute" data-attribute-name="Spalva" data-attribute-values='["Juoda"]'></div>
    <strong class="price curr_price49967"><span class="price-word">Kaina</span>88.20&nbsp;<span>€</span></strong>
  </div>
  <div class="grid product product-item item-list" data-pid="54757">
    <img src="https://shop.test/images/chair-2.jpg" class="item_image_54757">
    <a class="item-title" href="/kede-sbo25115" title="Kėdė SBO25115">Kėdė SBO25115</a>
    <strong class="price curr_price54757"><span>Price</span>129.00 €</strong>
  </div>`

const DETAILS = `
  <html><head>
    <script type="application/ld+json">{"@type":"Product","productID":"54757","name":"Sofa CA69571","description":"Patogi dvivietė sofa."}</script>
  </head><body>
    <div class="attributes mt10">
    <div data-attribute-name="Ilgis" data-attribute-values='["214 cm"]'></div>
    <div data-attribute-name="Plotis" data-attribute-values='["102 cm"]'></div>
    <div data-attribute-name="Spalva" data-attribute-values='["Ruda"]'></div>
    <div data-attribute-name="Kojų spalva" data-attribute-values='["Juoda"]'></div>
    </div>
    <div id="alternative_goods">
      <div data-attribute-name="Ilgis" data-attribute-values='["302 cm"]'></div>
      <div data-attribute-name="Spalva" data-attribute-values='["Balta"]'></div>
    </div>
  </body></html>`

const LIVE_DETAILS = DETAILS.replace(
  '"description":"Patogi dvivietė sofa."',
  '"description":"Patogi dvivietė sofa.","image":"https://shop.test/sofa.jpg","brand":"Wersal","offers":{"price":1850,"priceCurrency":"EUR","availability":"https://schema.org/InStock","url":"https://shop.test/sofa-ca69571"}',
).replace(
  '<script type="application/ld+json">{"@type":"Product"',
  '<script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[{"item":{"name":"Pradžia"}},{"item":{"name":"Svetainės baldai"}},{"item":{"name":"Sofos"}},{"item":{"name":"Sofa CA69571"}}]}</script><script type="application/ld+json">{"@type":"Product"',
)

describe('Verskis detection and parsing', () => {
  it('detects generator metadata regardless of attribute order and finds the localized search action', () => {
    expect(isVerskisHtml(HOME)).toBe(true)
    expect(verskisSearchUrl(HOME, 'https://shop.test')).toBe('https://shop.test/paieska')
    expect(verskisSearchUrl(HOME.replace('https://shop.test/paieska', 'https://evil.test/search'), 'https://shop.test')).toBeUndefined()
  })

  it('normalizes product cards, attributes, images, price, and total', () => {
    const products = parseVerskisProducts(RESULTS, 'https://shop.test')
    expect(parseVerskisTotal(RESULTS)).toBe(808)
    expect(products).toEqual([
      {
        id: '49967',
        title: 'Kėdė K05210',
        price: '88.20 €',
        url: 'https://shop.test/kede-k05210',
        imageUrl: 'https://shop.test/images/chair.jpg',
        inStock: true,
        shortDescription: 'Spalva: Juoda',
      },
      {
        id: '54757',
        title: 'Kėdė SBO25115',
        price: '129.00 €',
        url: 'https://shop.test/kede-sbo25115',
        imageUrl: 'https://shop.test/images/chair-2.jpg',
        inStock: true,
        shortDescription: undefined,
      },
    ])
  })

  it('extracts full product-page details needed to verify furniture constraints', () => {
    expect(parseVerskisProductDetails(DETAILS, 'https://shop.test/sofa-ca69571')).toEqual({
      id: 'https://shop.test/sofa-ca69571',
      title: 'Sofa CA69571',
      description: 'Patogi dvivietė sofa.',
      attributes: ['Ilgis: 214 cm', 'Plotis: 102 cm', 'Spalva: Ruda', 'Kojų spalva: Juoda'],
    })
  })

  it('parses structured catalog and live-hydration fields from a product page', () => {
    expect(parseVerskisPageProduct(LIVE_DETAILS, 'https://shop.test/sofa-ca69571')).toEqual({
      id: '54757',
      title: 'Sofa CA69571',
      url: 'https://shop.test/sofa-ca69571',
      imageUrl: 'https://shop.test/sofa.jpg',
      description: 'Patogi dvivietė sofa.',
      categories: ['Svetainės baldai', 'Sofos'],
      attributes: [
        'Ilgis: 214 cm',
        'Plotis: 102 cm',
        'Spalva: Ruda',
        'Kojų spalva: Juoda',
        'Prekės ženklas: Wersal',
      ],
      price: 1850,
      currency: 'EUR',
      inStock: true,
    })
  })
})

describe('Verskis connector', () => {
  it('discovers the search form, searches, applies price bounds, and limits results', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      return new Response(url.includes('/paieska?') ? RESULTS : HOME, { status: 200 })
    }) as unknown as typeof fetch

    const products = await searchVerskisProducts(
      'https://shop.test/category/deep',
      { query: 'kėdė', minPrice: 100, limit: 1 },
      { fetchImpl },
    )
    expect(products).toHaveLength(1)
    expect(products[0].id).toBe('54757')
    expect(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0])).toContain('q=k%C4%97d%C4%97')
  })

  it('enriches search candidates with full attributes in the same search', async () => {
    const oneResult = RESULTS.replace('results_total">808', 'results_total">1')
    const chairDetails = DETAILS.replaceAll('Sofa CA69571', 'Kėdė K05210').replace(
      'Spalva" data-attribute-values=\'["Ruda"]\'',
      'Spalva" data-attribute-values=\'["Kapučino"]\'',
    )
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/paieska?')) return new Response(oneResult)
      if (url.endsWith('/kede-k05210')) return new Response(chairDetails)
      return new Response(HOME)
    }) as unknown as typeof fetch

    const [product] = await searchVerskisProducts(
      'https://shop.test',
      { query: 'kėdė', limit: 1 },
      { fetchImpl },
    )
    expect(product.id).toBe('49967')
    expect(product.details).toContain('Spalva: Kapučino')
    expect(product.details).toContain('Ilgis: 214 cm')
  })

  it('does not treat recommendation carousels as search matches', async () => {
    const oneResult = RESULTS.replace('results_total">808', 'results_total">1')
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      new Response(String(input).includes('/paieska?') ? oneResult : HOME),
    ) as unknown as typeof fetch

    const products = await searchVerskisProducts(
      'https://shop.test',
      { query: 'kėdė', limit: 12 },
      { fetchImpl },
    )
    expect(products.map((product) => product.title)).toEqual(['Kėdė K05210'])
  })

  it('returns empty when the result count is zero even if promotional cards follow', async () => {
    const zeroResults = RESULTS.replace('results_total">808', 'results_total">0')
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      new Response(String(input).includes('/paieska?') ? zeroResults : HOME),
    ) as unknown as typeof fetch

    await expect(
      searchVerskisProducts('https://shop.test', { query: 'ruda sofa' }, { fetchImpl }),
    ).resolves.toEqual([])
  })

  it('fetches only same-origin detail URLs and limits a request to three products', async () => {
    const fetchImpl = vi.fn(async () => new Response(DETAILS)) as unknown as typeof fetch
    const details = await fetchVerskisProductDetails(
      'https://shop.test',
      [
        'https://shop.test/sofa-ca69571',
        'https://evil.test/not-allowed',
        'not-a-url',
        'https://shop.test/sofa-ca69571',
      ],
      { fetchImpl },
    )
    expect(details).toHaveLength(1)
    expect(details[0].attributes).toContain('Spalva: Ruda')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('hydrates indexed references with live price and stock using opaque ids', async () => {
    const fetchImpl = vi.fn(async () => new Response(LIVE_DETAILS)) as unknown as typeof fetch
    const products = await fetchVerskisProductsByRefs(
      'https://shop.test',
      [{ id: '54757', url: 'https://shop.test/sofa-ca69571' }],
      { fetchImpl },
    )
    expect(products).toEqual([
      expect.objectContaining({
        id: '54757',
        title: 'Sofa CA69571',
        price: '1850.00 €',
        inStock: true,
        url: 'https://shop.test/sofa-ca69571',
      }),
    ])
  })

  it('hydrates configurable products from the visible live price when JSON-LD omits it', async () => {
    const configurable = DETAILS.replace(
      '<body>',
      '<body><strong class="price c1" data-pricenew="1188.00" data-price-human="1188.00 €">1188.00 €</strong>',
    )
    const fetchImpl = vi.fn(async () => new Response(configurable)) as unknown as typeof fetch

    const products = await fetchVerskisProductsByRefs(
      'https://shop.test',
      [{ id: '54757', url: 'https://shop.test/sofa-ca69571' }],
      { fetchImpl },
    )

    expect(products).toEqual([
      expect.objectContaining({ id: '54757', price: '1188.00 €' }),
    ])
  })

  it('retries one failed live product page without dropping the candidate', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(LIVE_DETAILS)) as unknown as typeof fetch

    const products = await fetchVerskisProductsByRefs(
      'https://shop.test',
      [{ id: '54757', url: 'https://shop.test/sofa-ca69571' }],
      { fetchImpl },
    )

    expect(products).toHaveLength(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('validates and counts all URLs in same-origin product sitemaps', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/sitemap.xml')) {
        return new Response(
          '<sitemapindex><sitemap><loc>https://shop.test/products.xml?offset=0&amp;limit=2000</loc></sitemap></sitemapindex>',
        )
      }
      if (url.includes('/products.xml?')) {
        return new Response('<urlset><url><loc>https://shop.test/a</loc></url><url><loc>https://shop.test/b</loc></url></urlset>')
      }
      return new Response(HOME)
    }) as unknown as typeof fetch

    await expect(validateVerskisStore('https://shop.test', { fetchImpl })).resolves.toEqual({ ok: true, total: 2 })
  })

  it('is wired through the provider dispatcher', async () => {
    const config = { enabled: true, provider: 'verskis' as const, storeUrl: 'https://shop.test' }
    const searchFetch = vi.fn(async (input: RequestInfo | URL) =>
      new Response(String(input).includes('/paieska?') ? RESULTS : HOME),
    ) as unknown as typeof fetch
    expect(storeConfigured(config)).toBe(true)
    expect(productDetailsSupported(config)).toBe(true)
    expect(semanticIndexSupported(config)).toBe(true)
    await expect(searchStore(config, { query: 'kėdė', limit: 1 }, { fetchImpl: searchFetch })).resolves.toHaveLength(1)

    const detailFetch = vi.fn(async () => new Response(DETAILS)) as unknown as typeof fetch
    await expect(
      getProductDetails(config, ['https://shop.test/sofa-ca69571'], { fetchImpl: detailFetch }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'https://shop.test/sofa-ca69571',
        attributes: expect.arrayContaining(['Ilgis: 214 cm', 'Spalva: Ruda']),
      }),
    ])

    const validateFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/sitemap.xml')) {
        return new Response('<sitemapindex><sitemap><loc>https://shop.test/products.xml</loc></sitemap></sitemapindex>')
      }
      if (url.endsWith('/products.xml')) return new Response('<urlset><url><loc>https://shop.test/a</loc></url></urlset>')
      return new Response(HOME)
    }) as unknown as typeof fetch
    await expect(validateStore(config, { fetchImpl: validateFetch })).resolves.toEqual({ ok: true, total: 1 })
  })
})
