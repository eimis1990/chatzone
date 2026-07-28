import { describe, it, expect, vi } from 'vitest'
import {
  searchTravellineRooms,
  searchTravellineRoomTypes,
  fetchTravellineRoomDetails,
  validateTravellineStore,
  tlPropertyIds,
} from '@/lib/commerce/travelline'
import type { CommerceConfig } from '@/lib/commerce/capabilities'

const CONFIG: CommerceConfig = {
  enabled: true,
  provider: 'travelline',
  storeUrl: 'https://hotel.example',
  tlClientId: 'cid',
  tlClientSecret: 'secret',
  tlPropertyId: '777',
}

const PROPERTY = {
  id: '777',
  name: 'Hotel Demo',
  currency: 'EUR',
  roomTypes: [
    {
      id: 'rt-1',
      name: 'Standard Double',
      description: 'Cozy double room with a city view.',
      images: [{ url: 'https://img/std.jpg' }],
      occupancy: { adultBed: 2, extraBed: 1 },
      categoryName: 'Double',
      amenities: [{ name: 'Wi-Fi' }, { name: 'Air conditioning' }],
      size: { value: 22, unit: 'm²' },
    },
    {
      id: 'rt-2',
      name: 'Family Suite',
      description: 'Two rooms, sleeps four.',
      images: [],
      occupancy: { adultBed: 4 },
      categoryName: 'Suite',
    },
  ],
  ratePlans: [{ id: 'rp-1', name: 'Flexible rate', description: 'Pay at the hotel.' }],
}

const ROOM_STAYS = {
  roomStays: [
    {
      roomType: { id: 'rt-1' },
      ratePlan: { id: 'rp-1' },
      availability: 3,
      currencyCode: 'EUR',
      total: { priceBeforeTax: 240 },
      cancellationPolicy: { freeCancellationPossible: true },
      mealPlanCode: 'BB',
      bookingFormLink: 'https://book.tl/deep-link',
      checksum: 'chk-1',
    },
    {
      roomType: { id: 'rt-2' },
      availability: 0,
      currencyCode: 'EUR',
      total: { priceBeforeTax: 410.5 },
      cancellationPolicy: { freeCancellationPossible: false },
      bookingFormLink: 'https://book.tl/deep-link-2',
      checksum: 'chk-2',
    },
  ],
}

/** Fake TL backend: auth token + search + content endpoints. Counts token calls. */
function fakeFetch() {
  const calls = { token: 0 }
  const impl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (url.includes('/auth/token')) {
      calls.token++
      return json({ access_token: `tok-${calls.token}`, expires_in: 900 })
    }
    if (url.includes('/api/content/v1/properties/')) return json(PROPERTY)
    if (url.includes('/room-stays')) return json(ROOM_STAYS)
    return new Response('not found', { status: 404 })
  }) as unknown as typeof fetch
  return { impl, calls }
}

describe('searchTravellineRooms', () => {
  it('maps room stays to product cards with booking deep links', async () => {
    const { impl } = fakeFetch()
    const offers = await searchTravellineRooms(
      CONFIG,
      { arrivalDate: '2026-08-10', departureDate: '2026-08-13', adults: 2, childAges: [6] },
      { fetchImpl: impl },
    )
    expect(offers).toHaveLength(2)
    const [first, second] = offers
    expect(first.title).toBe('Standard Double — Flexible rate')
    expect(first.price).toBe('240 EUR')
    expect(first.url).toBe('https://book.tl/deep-link')
    expect(first.imageUrl).toBe('https://img/std.jpg')
    expect(first.inStock).toBe(true)
    expect(first.shortDescription).toContain('3 nights')
    expect(first.shortDescription).toContain('3 guests')
    expect(first.shortDescription).toContain('free cancellation')
    expect(second.inStock).toBe(false)
    expect(second.price).toBe('410.50 EUR')
    expect(second.title).toBe('Family Suite')
  })

  it('reuses the cached token across requests', async () => {
    const { impl, calls } = fakeFetch()
    const cfg = { ...CONFIG, tlClientId: 'cid-cache-test' }
    await searchTravellineRooms(cfg, { arrivalDate: '2026-08-10', departureDate: '2026-08-11', adults: 1 }, { fetchImpl: impl })
    await searchTravellineRooms(cfg, { arrivalDate: '2026-08-12', departureDate: '2026-08-13', adults: 1 }, { fetchImpl: impl })
    expect(calls.token).toBe(1)
  })
})

describe('searchTravellineRoomTypes (dateless browsing)', () => {
  it('filters room types by keyword and never invents prices', async () => {
    const { impl } = fakeFetch()
    const rooms = await searchTravellineRoomTypes(
      { ...CONFIG, tlClientId: 'cid-types' },
      { query: 'family' },
      { fetchImpl: impl },
    )
    expect(rooms.map((r) => r.title)).toEqual(['Family Suite'])
    expect(rooms[0].price).toBe('')
    expect(rooms[0].url).toBe('https://hotel.example')
  })

  it('falls back to the full room list when no tokens match', async () => {
    const { impl } = fakeFetch()
    const rooms = await searchTravellineRoomTypes(
      { ...CONFIG, tlClientId: 'cid-types-2' },
      { query: 'zzz-nomatch' },
      { fetchImpl: impl },
    )
    expect(rooms).toHaveLength(2)
  })
})

describe('fetchTravellineRoomDetails', () => {
  it('returns content-based details with attributes', async () => {
    const { impl } = fakeFetch()
    const details = await fetchTravellineRoomDetails(
      { ...CONFIG, tlClientId: 'cid-details' },
      ['rt-1', 'missing'],
      { fetchImpl: impl },
    )
    expect(details).toHaveLength(1)
    expect(details[0].description).toContain('city view')
    expect(details[0].attributes?.join(' | ')).toContain('Wi-Fi')
    expect(details[0].attributes?.join(' | ')).toContain('22 m²')
  })
})

describe('multi-property (hotel chains)', () => {
  const PROPERTY_B = {
    id: '888',
    name: 'Seaside Villa',
    currency: 'EUR',
    roomTypes: [
      { id: 'rt-9', name: 'Sea View Double', description: 'Waves included.', images: [] },
    ],
    ratePlans: [],
  }
  const MULTI_STAYS = {
    roomStays: [
      {
        propertyId: '777',
        roomType: { id: 'rt-1' },
        ratePlan: { id: 'rp-1' },
        currencyCode: 'EUR',
        total: { priceBeforeTax: 240 },
        bookingFormLink: 'https://book.tl/777',
        // ShortRoomStay: no availability / cancellationPolicy / checksum.
      },
      {
        propertyId: '888',
        roomType: { id: 'rt-9' },
        currencyCode: 'EUR',
        total: { priceBeforeTax: 310 },
        bookingFormLink: 'https://book.tl/888',
      },
    ],
  }

  function multiFetch() {
    const posts: string[] = []
    const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
      if (url.includes('/auth/token')) return json({ access_token: 'tok', expires_in: 900 })
      if (url.includes('/properties/room-stays/search')) {
        posts.push(String(init?.body))
        return json(MULTI_STAYS)
      }
      if (url.includes('/api/content/v1/properties/888')) return json(PROPERTY_B)
      if (url.includes('/api/content/v1/properties/')) return json(PROPERTY)
      return new Response('not found', { status: 404 })
    }) as unknown as typeof fetch
    return { impl, posts }
  }

  it('parses one or many property ids', () => {
    expect(tlPropertyIds({ tlPropertyId: '777' })).toEqual(['777'])
    expect(tlPropertyIds({ tlPropertyId: ' 777, 888;999 ' })).toEqual(['777', '888', '999'])
    expect(tlPropertyIds({ tlPropertyId: '' })).toEqual([])
  })

  it('uses the multi-property POST, prefixes hotel names, and treats offers as available', async () => {
    const { impl, posts } = multiFetch()
    const cfg = { ...CONFIG, tlClientId: 'cid-multi', tlPropertyId: '777, 888' }
    const offers = await searchTravellineRooms(
      cfg,
      { arrivalDate: '2026-08-10', departureDate: '2026-08-12', adults: 2 },
      { fetchImpl: impl },
    )
    expect(posts).toHaveLength(1)
    expect(JSON.parse(posts[0]).propertyIds).toEqual(['777', '888'])
    expect(offers.map((o) => o.title)).toEqual([
      'Hotel Demo — Standard Double — Flexible rate',
      'Seaside Villa — Sea View Double',
    ])
    // ShortRoomStay has no availability count and no cancellation policy —
    // offers are bookable, and we must not claim "non-refundable".
    expect(offers.every((o) => o.inStock)).toBe(true)
    expect(offers[0].shortDescription).not.toContain('refundable')
  })

  it('browses room types across hotels with property-scoped ids', async () => {
    const { impl } = multiFetch()
    const cfg = { ...CONFIG, tlClientId: 'cid-multi-2', tlPropertyId: '777,888' }
    const rooms = await searchTravellineRoomTypes(cfg, { query: 'waves' }, { fetchImpl: impl })
    expect(rooms.map((r) => r.title)).toEqual(['Seaside Villa — Sea View Double'])
    expect(rooms[0].id).toBe('888:rt-9')
    const details = await fetchTravellineRoomDetails(cfg, ['888:rt-9'], { fetchImpl: impl })
    expect(details[0].attributes?.join(' | ')).toContain('Hotel: Seaside Villa')
  })
})

describe('validateTravellineStore', () => {
  it('reports ok + room type count', async () => {
    const { impl } = fakeFetch()
    const res = await validateTravellineStore({ ...CONFIG, tlClientId: 'cid-validate' }, { fetchImpl: impl })
    expect(res).toEqual({ ok: true, total: 2 })
  })

  it('fails closed on auth errors', async () => {
    const failing = (async () => new Response('nope', { status: 401 })) as unknown as typeof fetch
    // Distinct property id — the content cache is keyed by property.
    const res = await validateTravellineStore(
      { ...CONFIG, tlClientId: 'cid-bad', tlPropertyId: '999' },
      { fetchImpl: failing },
    )
    expect(res).toEqual({ ok: false, total: 0 })
  })
})
