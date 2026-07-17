import type { CommerceProviderProfile } from './types'

/** Feed products stay keyword-only until the provider gains an id-based live
 * hydration path. Keeping an explicit profile prevents accidental fallthrough
 * to another provider's behavior. */
export const feedProductSearchProfile: CommerceProviderProfile = {
  provider: 'feed',
}
