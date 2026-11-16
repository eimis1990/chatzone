import { isInternalOrg } from '@/lib/entitlements'

/** Org fields the channel gate needs. */
export type ChannelOrg = {
  messenger_addon?: boolean | null
  is_demo?: boolean | null
  is_platform?: boolean | null
} | null | undefined

/** Published Messenger is available to paid or explicitly granted/internal orgs. */
export function canConnectChannels(org: ChannelOrg): boolean {
  return Boolean(org?.messenger_addon) || isInternalOrg(org)
}
