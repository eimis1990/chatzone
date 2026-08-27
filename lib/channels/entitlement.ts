import { isInternalOrg } from '@/lib/entitlements'

/** Org fields the channel gate needs. */
export type ChannelOrg = {
  messenger_addon?: boolean | null
  is_demo?: boolean | null
  is_platform?: boolean | null
} | null | undefined

/**
 * May this org reach the Messenger connect flow?
 *
 * The Meta app is still unpublished, so Facebook Login only succeeds for
 * people holding a role on it — showing every client a live "Connect" button
 * would hand them a broken flow. Access is therefore limited to:
 *   - internal orgs (platform/demo) — our own testing and the App Review
 *     screencast;
 *   - orgs with `messenger_addon` — set true for the Meta reviewer's test org
 *     so they can walk the flow themselves, and later the billing entitlement;
 *   - local development, so the flow is always reachable while building.
 *
 * Server-side only: the Subscription card and connect page both call this, and
 * the connect page enforces it before any OAuth or write happens.
 */
export function canConnectChannels(org: ChannelOrg): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  return Boolean(org?.messenger_addon) || isInternalOrg(org)
}
