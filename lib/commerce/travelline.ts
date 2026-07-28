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
 * `tlPropertyId` accepts ONE OR MANY property ids (comma/space separated) — a
 * chain client searches all their hotels in one call (TL's multi-property
 * search, max 200 ids). With multiple hotels, titles are prefixed with the
 * hotel name and room ids with the property id.
 *
 * All egress goes to the fixed partner host — no tenant-supplied URLs, so no
 * SSRF guard needed here. Docs: https://www.travelline.ru/dev-portal/docs/api/
 */

const TL_HOST = 'https://partner.tlintegration.com'
const AUTH_URL = `${TL_HOST}/auth/token`
const SEARCH_BASE = `${TL_HOST}/api/search/v1`
const CONTENT_BASE = `${TL_HOST}/api/content/v1`

type TlCreds = Pick<CommerceConfig, 'tlClientId' | 'tlClientSecret'>

/** Parse the configured property id(s) — comma/whitespace separated. */
export function tlPropertyIds(config: Pick<CommerceConfig, 'tlPropertyId'>): string[] {
  return (config.tlPropertyId ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

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

async function tlRequest<T>(
  url: string,
  creds: TlCreds,
  deps: CommerceDeps,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const f = deps.fetchImpl ?? fetch
  const token = await getToken(creds, deps)
  const res = await f(url, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  })
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

async function getProperty(
  creds: TlCreds,
  propertyId: string,
  deps: CommerceDeps,
): Promise<TlProperty> {
  const cached = contentCache.get(propertyId)
  if (cached && cached.expiresAt > Date.now()) return cached.property
  const property = await tlRequest<TlProperty>(
    `${CONTENT_BASE}/properties/${encodeURIComponent(propertyId)}?include=all`,
    creds,
    deps,
  )
  contentCache.set(propertyId, { property, expiresAt: Date.now() + CONTENT_TTL_MS })
  return property
}

/** All configured properties' content (chains have several hotels). */
async function getProperties(config: CommerceConfig, deps: CommerceDeps): Promise<TlProperty[]> {
  const ids = tlPropertyIds(config)
  return Promise.all(ids.map((id) => getProperty(config, id, deps)))
}

// ── Dated availability search — the real booking path. ──────────────────────
/** Superset of DetailedRoomStay (single-property GET) and ShortRoomStay
 *  (multi-property POST — no availability/cancellation/checksum). */
interface TlRoomStay {
  propertyId?: string
  roomType?: { id?: string }
  ratePlan?: { id?: string }
  availability?: number
  currencyCode?: string
  total?: { priceBeforeTax?: number; taxAmount?: number }
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

/** Live room-stay offers for a date range, as product cards. Searches every
 *  configured property (single GET for one hotel, multi-property POST for a chain). */
export async function searchTravellineRooms(
  config: CommerceConfig,
  params: TlAvailabilityParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const ids = tlPropertyIds(config)
  if (ids.length === 0) return []
  const multi = ids.length > 1

  const stayPromise: Promise<TlRoomStay[]> = multi
    ? tlRequest<{ roomStays?: TlRoomStay[] }>(`${SEARCH_BASE}/properties/room-stays/search`, config, deps, {
        method: 'POST',
        body: {
          propertyIds: ids,
          arrivalDate: params.arrivalDate,
          departureDate: params.departureDate,
          adults: params.adults,
          ...(params.childAges?.length ? { childAges: params.childAges } : {}),
        },
      }).then((r) => (r.roomStays ?? []).map((s) => ({ ...s })))
    : (() => {
        const qs = new URLSearchParams({
          arrivalDate: params.arrivalDate,
          departureDate: params.departureDate,
          adults: String(params.adults),
        })
        for (const age of params.childAges ?? []) qs.append('childAges', String(age))
        return tlRequest<{ roomStays?: TlRoomStay[] }>(
          `${SEARCH_BASE}/properties/${encodeURIComponent(ids[0])}/room-stays?${qs}`,
          config,
          deps,
        ).then((r) => (r.roomStays ?? []).map((s) => ({ ...s, propertyId: s.propertyId ?? ids[0] })))
      })()

  const [stays, properties] = await Promise.all([
    stayPromise,
    getProperties(config, deps).catch(() => [] as TlProperty[]),
  ])

  const propertyById = new Map(properties.map((p) => [p.id, p]))
  const nights = nightsBetween(params.arrivalDate, params.departureDate)
  const guests = params.adults + (params.childAges?.length ?? 0)

  return stays.map((stay, i) => {
    const property = stay.propertyId ? propertyById.get(stay.propertyId) : properties[0]
    const roomType = stay.roomType?.id
      ? property?.roomTypes?.find((r) => r.id === stay.roomType!.id)
      : undefined
    const ratePlan = stay.ratePlan?.id
      ? property?.ratePlans?.find((r) => r.id === stay.ratePlan!.id)
      : undefined
    const roomName = roomType?.name ?? stay.fullPlacementsName ?? 'Room'
    const rateName = ratePlan?.name
    let title = rateName && rateName !== roomName ? `${roomName} — ${rateName}` : roomName
    if (multi && property?.name) title = `${property.name} — ${title}`

    const shortParts = [
      `${nights} night${nights === 1 ? '' : 's'}`,
      `${guests} guest${guests === 1 ? '' : 's'}`,
    ]
    // ShortRoomStay (multi-property) has no cancellation policy — say nothing
    // rather than falsely claiming "non-refundable".
    if (stay.cancellationPolicy) {
      shortParts.push(
        stay.cancellationPolicy.freeCancellationPossible ? 'free cancellation' : 'non-refundable',
      )
    }
    if (stay.mealPlanCode) shortParts.push(`meal plan ${stay.mealPlanCode}`)

    return {
      id:
        stay.checksum ??
        `${stay.propertyId ?? 'p'}:${stay.roomType?.id ?? 'room'}:${stay.ratePlan?.id ?? 'rate'}:${i}`,
      title,
      price: formatPrice(stay.total?.priceBeforeTax, stay.currencyCode ?? property?.currency),
      // The TL booking engine link with dates/room prefilled — checkout happens
      // on TravelLine's side (their Search API terms require it; we avoid PCI).
      url: stay.bookingFormLink || config.storeUrl || '#',
      imageUrl: roomType?.images?.[0]?.url,
      // Offers without an availability count (multi-property short results) are
      // returned because they're bookable — treat as available.
      inStock: stay.availability == null ? true : stay.availability > 0,
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

/** Room-type id disambiguated per property for multi-hotel configs. */
const roomRef = (propertyId: string, roomTypeId: string, multi: boolean) =>
  multi ? `${propertyId}:${roomTypeId}` : roomTypeId

export async function searchTravellineRoomTypes(
  config: CommerceConfig,
  params: ProductSearchParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const properties = await getProperties(config, deps)
  const multi = properties.length > 1
  const all = properties.flatMap((property) =>
    (property.roomTypes ?? []).map((room) => ({ property, room })),
  )
  const tokens = fold(params.query).split(/\s+/).filter((t) => t.length > 2)
  const matches = tokens.length
    ? all.filter(({ property, room }) => {
        const hay = fold(
          [room.name, room.description, room.categoryName, multi ? property.name : undefined]
            .filter(Boolean)
            .join(' '),
        )
        return tokens.some((t) => hay.includes(t))
      })
    : all
  // A generic query ("rooms", "kambariai") often matches nothing token-wise —
  // room browsing should show the catalog rather than a false "no results".
  const list = matches.length ? matches : all
  return list.slice(0, params.limit ?? 24).map(({ property, room }) => ({
    id: roomRef(property.id, room.id, multi),
    title: multi && property.name ? `${property.name} — ${room.name ?? 'Room'}` : room.name ?? 'Room',
    // No dates → no price. The check_availability tool quotes real totals.
    price: '',
    url: config.storeUrl || '#',
    imageUrl: room.images?.[0]?.url,
    inStock: true,
    shortDescription: [room.categoryName, occupancySummary(room)].filter(Boolean).join(' · '),
    details: room.description?.slice(0, 800),
  }))
}

function occupancySummary(r: TlRoomType): string | undefined {
  const beds = r.occupancy?.adultBed
  if (!beds) return undefined
  const extra = r.occupancy?.extraBed ? ` (+${r.occupancy.extraBed} extra)` : ''
  return `sleeps ${beds}${extra}`
}

/** Full room-type details from content — powers the get_product_details tool.
 *  Accepts plain room-type ids and `propertyId:roomTypeId` refs (multi-hotel). */
export async function fetchTravellineRoomDetails(
  config: CommerceConfig,
  ids: string[],
  deps: CommerceDeps = {},
): Promise<ProductDetails[]> {
  const properties = await getProperties(config, deps)
  const rooms = properties.flatMap((property) =>
    (property.roomTypes ?? []).map((room) => ({ property, room })),
  )
  return ids
    .map((ref) => {
      const [maybePid, maybeRoomId] = ref.includes(':') ? ref.split(':', 2) : [undefined, ref]
      return rooms.find(
        ({ property, room }) =>
          room.id === maybeRoomId && (maybePid === undefined || property.id === maybePid),
      )
    })
    .filter((hit): hit is { property: TlProperty; room: TlRoomType } => Boolean(hit))
    .map(({ property, room }) => ({
      id: roomRef(property.id, room.id, properties.length > 1),
      title: room.name ?? 'Room',
      description: room.description?.slice(0, 1500),
      attributes: [
        properties.length > 1 && property.name ? `Hotel: ${property.name}` : undefined,
        room.categoryName ? `Category: ${room.categoryName}` : undefined,
        occupancySummary(room) ? `Occupancy: ${occupancySummary(room)}` : undefined,
        room.size?.value ? `Size: ${room.size.value} ${room.size.unit ?? 'm²'}` : undefined,
        room.amenities?.length
          ? `Amenities: ${room.amenities.map((a) => a.name).filter(Boolean).slice(0, 20).join(', ')}`
          : undefined,
      ].filter((a): a is string => Boolean(a)),
    }))
}

/** Configurator "Test connection": token + every property fetch → room type count. */
export async function validateTravellineStore(
  config: CommerceConfig,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; total: number }> {
  try {
    const properties = await getProperties(config, deps)
    const ok = properties.length > 0 && properties.every((p) => Boolean(p?.id))
    return { ok, total: properties.reduce((sum, p) => sum + (p.roomTypes?.length ?? 0), 0) }
  } catch {
    return { ok: false, total: 0 }
  }
}
