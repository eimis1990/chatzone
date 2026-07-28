import type { CommerceProviderProfile } from './types'

/** TravelLine (hospitality): no semantic index — a hotel has ~5–20 room types,
 * so `search_products` filters Content-API room types by keyword, and dated
 * offers come from the dedicated `check_availability` tool. */
export const travellineProductSearchProfile: CommerceProviderProfile = {
  provider: 'travelline',
}
