import type { SupabaseClient } from '@supabase/supabase-js'
import { canConnectChannels, type ChannelOrg } from './entitlement'

export async function hasMessengerAccess(db: SupabaseClient, orgId: string): Promise<boolean> {
  const { data, error } = await db.from('organizations')
    .select('messenger_addon, is_demo, is_platform').eq('id', orgId).maybeSingle<ChannelOrg>()
  if (error) throw new Error('Could not verify Messenger subscription')
  return canConnectChannels(data)
}
