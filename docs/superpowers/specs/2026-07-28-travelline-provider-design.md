# TravelLine provider — hotel booking assistant

Date: 2026-07-28 · Status: approved direction (owner: "fully support it")

## What TravelLine is

Hospitality platform (12k+ properties) with a public Partner API at
`partner.tlintegration.com`. Verified surface (OpenAPI specs downloaded):

- **Auth**: `POST /auth/token`, OAuth2 client-credentials (`client_id` +
  `client_secret`), 15-minute bearer tokens.
- **Search API**: `GET /api/search/v1/properties/{propertyId}/room-stays`
  `?arrivalDate&departureDate&adults&childAges` → `roomStays[]`
  (`DetailedRoomStay`): `roomType.id`, `ratePlan.id`, `availability`,
  `currencyCode`, `total.priceBeforeTax`, `cancellationPolicy`,
  `mealPlanCode`, **`bookingFormLink`** (prefilled booking-engine URL —
  checkout handoff is a link; we never touch payment).
- **Content API**: `GET /api/content/v1/properties/{propertyId}` →
  `name/description/images`, `roomTypes[] {id, name, description, images,
  occupancy, amenities, size}`, `ratePlans[] {id, name, description}`.

## Model: rooms are products

Room offers map onto the existing `CommerceProduct` pipeline (cards, tool
loop, component folders) — no new widget component needed: title = room type
(+ rate plan), price = stay total, url = `bookingFormLink`, image from
content, `inStock` = availability > 0.

- `travelline` joins the `CommerceProvider` union → compile errors force every
  integration point (profiles, guidance, transports, config UI, folder label).
- Config fields: `tlClientId`, `tlClientSecret` (server-only), `tlPropertyId`;
  `storeUrl` = hotel website (fallback card link for dateless room browsing).
- **Transport** `lib/commerce/travelline.ts`: module-level token cache
  (expiry-aware), content cache (10 min), `searchTravellineRooms` (dated),
  `travellineRoomTypeProducts` (dateless — powers `search_products` for "what
  rooms do you have"), `fetchTravellineRoomDetails` (content-based details
  tool), `validateTravellineStore` (configurator Test). All egress goes to the
  fixed TL host — no tenant-URL SSRF surface.
- **New chat tool `check_availability`** (travelline only): check-in/out dates
  + adults (+ child ages) → live Search API → results registered as candidates
  so `display_products` renders them as product cards. Query guidance: always
  collect dates + guests before quoting prices; prices only from tool results.
- **No semantic index / catalog sync**: a hotel has ~5–20 room types; the
  dateless path filters content room types by keyword. No order lookup
  (Read Reservation API is per-property PII — out of scope).
- Components: `travelline` folder auto-appears (labels record); seed migration
  assigns `product-cards:default`. Knowledge ingestion (hotel site crawl → RAG)
  works unchanged.

## Out of scope (deliberate)

In-chat booking creation (TL terms push checkout to their engine anyway),
multi-property search (`POST /properties/room-stays/search`), extra services /
extra-stays endpoints, meal-plan name resolution, Reservation/PMS APIs.

## Testing

Transport unit tests with injected `fetchImpl` (token + search + content
fixtures → product mapping, incl. token reuse). Live testing requires TL test
credentials — request from TravelLine (first real-world step).
