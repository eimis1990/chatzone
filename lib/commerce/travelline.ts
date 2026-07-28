import type {
  CommerceDeps,
  CommerceProduct,
  ProductDetails,
  ProductSearchParams,
} from '@/lib/commerce/types'
import type { CommerceConfig } from '@/lib/commerce/capabilities'

/**
 * TravelLine Partner API transport (hospitality — hotels on the TL platform).
 *
 * Rooms are mapped onto the CommerceProduct pipeline: a dated availability
 * search returns bookable room-stay OFFERS (price for the whole stay, and a
 * `bookingFormLink` deep link into TL's own booking engine — we never touch
 * payment), while the dateless path lists room TYPES from the Content API for
 * "what rooms do you have" browsing.
 *
 * All egress goes to the fixed partner host — no tenant-supplied URLs, so no
 * SSRF guard needed here. Docs: https://www.travelline.ru/dev-portal/docs/api/
 */

const TL_HOST = 'https://partner.tlintegration.com'
const AUTH_URL = `${TL_HOST}/auth/token`
const SEARCH_BASE = `${TL_HOST}/api/search/v1`
const CONTENT_BASE = `${TL_HOST}/api/content/v1`

type TlCreds = Pick<CommerceConfig, 'tlClientId' | 'tlClientSecret' | 'tlPropertyId'>

// ── Auth: client-credentials tokens live 15 min; cache per client id. ────────
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getToken(creds: TlCreds, deps: CommerceDeps): Promise<string> {
  const key = creds.tlClientId ?? ''
  const cached = tokenCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.token

  const f = deps.fetchImpl ?? fetch
  const res = await f(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.tlClientId ?? '',
      client_secret: creds.tlClientSecret ?? '',
    }),
  })
  if (!res.ok) throw new Error(`TravelLine auth failed (${res.status})`)
  const json = (await res.json()) as { access_token: string; expires_in?: number }
  const ttlMs = Math.max(60, (json.expires_in ?? 900) - 60) * 1000
  tokenCache.set(key, { token: json.access_token, expiresAt: Date.now() + ttlMs })
  return json.access_token
}

async function tlGet<T>(url: string, creds: TlCreds, deps: CommerceDeps): Promise<T> {
  const f = deps.fetchImpl ?? fetch
  const token = await getToken(creds, deps)
  const res = await f(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`TravelLine request failed (${res.status}) ${url}`)
  return (await res.json()) as T
}

// ── Content API (property + room types) — small payload, cache 10 min. ──────
interface TlRoomType {
  id: string
  name?: string
  description?: string
  images?: { url: string }[]
  amenities?: { name?: string }[]
  size?: { value?: number; unit?: string }
  occupancy?: { adultBed?: number; extraBed?: number; childWithoutBed?: number }
  categoryName?: string
}

interface TlProperty {
  id: string
  name?: string
  description?: string
  currency?: string
  images?: { url: string }[]
  roomTypes?: TlRoomType[]
  ratePlans?: { id: string; name?: string; description?: string }[]
}

const contentCache = new Map<string, { property: TlProperty; expiresAt: number }>()
const CONTENT_TTL_MS = 10 * 60 * 1000

export async function getTravellineProperty(
  config: CommerceConfig,
  deps: CommerceDeps = {},
): Promise<TlProperty> {
  const key = config.tlPropertyId ?? ''
  const cached = contentCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.property
  const property = await tlGet<TlProperty>(
    `${CONTENT_BASE}/properties/${encodeURIComponent(key)}?include=all`,
    config,
    deps,
  )
  contentCache.set(key, { property, expiresAt: Date.now() + CONTENT_TTL_MS })
  return property
}

// ── Dated availability search — the real booking path. ──────────────────────
interface TlRoomStay {
  roomType?: { id?: string }
  ratePlan?: { id?: string }
  availability?: number
  currencyCode?: string
  total?: { priceBeforeTax?: number; taxAmount?: number }
  stayDates?: { arrivalDateTime?: string; departureDateTime?: string }
  guestCount?: { adultCount?: number; childAges?: number[] }
  cancellationPolicy?: { freeCancellationPossible?: boolean; freeCancellationDeadlineLocal?: string }
  mealPlanCode?: string
  bookingFormLink?: string
  fullPlacementsName?: string
  checksum?: string
}

export interface TlAvailabilityParams {
  /** ISO dates (YYYY-MM-DD). */
  arrivalDate: string
  departureDate: string
  adults: number
  childAges?: number[]
}

function formatPrice(amount: number | undefined, currency: string | undefined): string {
  if (amount == null) return ''
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  return currency ? `${rounded} ${currency}` : rounded
}

function nightsBetween(arrival: string, departure: string): number {
  const ms = new Date(departure).getTime() - new Date(arrival).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

/** Live room-stay offers for a date range, as product cards. */
export async function searchTravellineRooms(
  config: CommerceConfig,
  params: TlAvailabilityParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const qs = new URLSearchParams({
    arrivalDate: params.arrivalDate,
    departureDate: params.departureDate,
    adults: String(params.adults),
  })
  for (const age of params.childAges ?? []) qs.append('childAges', String(age))

  const [result, property] = await Promise.all([
    tlGet<{ roomStays?: TlRoomStay[] }>(
      `${SEARCH_BASE}/properties/${encodeURIComponent(config.tlPropertyId ?? '')}/room-stays?${qs}`,
      config,
      deps,
    ),
    getTravellineProperty(config, deps).catch(() => null),
  ])

  const roomTypeById = new Map((property?.roomTypes ?? []).map((r) => [r.id, r]))
  const ratePlanById = new Map((property?.ratePlans ?? []).map((r) => [r.id, r]))
  const nights = nightsBetween(params.arrivalDate, params.departureDate)
  const guests = params.adults + (params.childAges?.length ?? 0)

  return (result.roomStays ?? []).map((stay, i) => {
    const roomType = stay.roomType?.id ? roomTypeById.get(stay.roomType.id) : undefined
    const ratePlan = stay.ratePlan?.id ? ratePlanById.get(stay.ratePlan.id) : undefined
    const roomName = roomType?.name ?? stay.fullPlacementsName ?? 'Room'
    const rateName = ratePlan?.name
    const cancellation = stay.cancellationPolicy?.freeCancellationPossible
      ? 'free cancellation'
      : 'non-refundable'
    const shortParts = [
      `${nights} night${nights === 1 ? '' : 's'}`,
      `${guests} guest${guests === 1 ? '' : 's'}`,
      cancellation,
    ]
    if (stay.mealPlanCode) shortParts.push(`meal plan ${stay.mealPlanCode}`)
    return {
      id: stay.checksum ?? `${stay.roomType?.id ?? 'room'}:${stay.ratePlan?.id ?? 'rate'}:${i}`,
      title: rateName && rateName !== roomName ? `${roomName} — ${rateName}` : roomName,
      price: formatPrice(stay.total?.priceBeforeTax, stay.currencyCode ?? property?.currency),
      // The TL booking engine link with dates/room prefilled — checkout happens
      // on TravelLine's side (their Search API terms require it; we avoid PCI).
      url: stay.bookingFormLink || config.storeUrl || '#',
      imageUrl: roomType?.images?.[0]?.url,
      inStock: (stay.availability ?? 0) > 0,
      shortDescription: shortParts.join(' · '),
      details: [
        roomType?.description,
        stay.cancellationPolicy?.freeCancellationDeadlineLocal
          ? `Free cancellation until ${stay.cancellationPolicy.freeCancellationDeadlineLocal}`
          : undefined,
        ratePlan?.description,
      ]
        .filter(Boolean)
        .join(' | ')
        .slice(0, 800),
    }
  })
}

// ── Dateless browsing: room TYPES from content (search_products path). ──────
const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')

export async function searchTravellineRoomTypes(
  config: CommerceConfig,
  params: ProductSearchParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const property = await getTravellineProperty(config, deps)
  const rooms = property.roomTypes ?? []
  const tokens = fold(params.query).split(/\s+/).filter((t) => t.length > 2)
  const matches = tokens.length
    ? rooms.filter((r) => {
        const hay = fold([r.name, r.description, r.categoryName].filter(Boolean).join(' '))
        return tokens.some((t) => hay.includes(t))
      })
    : rooms
  // A generic query ("rooms", "kambariai") often matches nothing token-wise —
  // room browsing should show the catalog rather than a false "no results".
  const list = matches.length ? matches : rooms
  return list.slice(0, params.limit ?? 24).map((r) => ({
    id: r.id,
    title: r.name ?? 'Room',
    // No dates → no price. The check_availability tool quotes real totals.
    price: '',
    url: config.storeUrl || '#',
    imageUrl: r.images?.[0]?.url,
    inStock: true,
    shortDescription: [r.categoryName, occupancySummary(r)].filter(Boolean).join(' · '),
    details: r.description?.slice(0, 800),
  }))
}

function occupancySummary(r: TlRoomType): string | undefined {
  const beds = r.occupancy?.adultBed
  if (!beds) return undefined
  const extra = r.occupancy?.extraBed ? ` (+${r.occupancy.extraBed} extra)` : ''
  return `sleeps ${beds}${extra}`
}

/** Full room-type details from content — powers the get_product_details tool. */
export async function fetchTravellineRoomDetails(
  config: CommerceConfig,
  ids: string[],
  deps: CommerceDeps = {},
): Promise<ProductDetails[]> {
  const property = await getTravellineProperty(config, deps)
  const byId = new Map((property.roomTypes ?? []).map((r) => [r.id, r]))
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is TlRoomType => Boolean(r))
    .map((r) => ({
      id: r.id,
      title: r.name ?? 'Room',
      description: r.description?.slice(0, 1500),
      attributes: [
        r.categoryName ? `Category: ${r.categoryName}` : undefined,
        occupancySummary(r) ? `Occupancy: ${occupancySummary(r)}` : undefined,
        r.size?.value ? `Size: ${r.size.value} ${r.size.unit ?? 'm²'}` : undefined,
        r.amenities?.length
          ? `Amenities: ${r.amenities.map((a) => a.name).filter(Boolean).slice(0, 20).join(', ')}`
          : undefined,
      ].filter((a): a is string => Boolean(a)),
    }))
}

/** Configurator "Test connection": token + property fetch → room type count. */
export async function validateTravellineStore(
  config: CommerceConfig,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; total: number }> {
  try {
    const property = await getTravellineProperty(config, deps)
    return { ok: Boolean(property?.id), total: property.roomTypes?.length ?? 0 }
  } catch {
    return { ok: false, total: 0 }
  }
}
