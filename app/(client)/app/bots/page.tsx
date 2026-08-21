import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { BotCards } from '@/components/bot-views/BotCards'
import type { Bot } from '@/lib/types'

export const metadata = { title: 'My Bots | Loqara' }

/** Dedicated bot-management screen: every bot card in one place (the sidebar's
 *  "My Bots" lands here), with pause/activate, delete, and create. */
export default async function MyBotsPage() {
  await requireRole('client')
  const orgId = (await getUserOrgIds())[0] ?? null

  let bots: Bot[] = []
  if (orgId) {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('bots')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    bots = (data ?? []) as Bot[]
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">My Bots</h1>
        <p className="text-sm text-muted-foreground">
          Create, pause, and manage your chatbots. Paused bots stop answering everywhere until
          you activate them again.
        </p>
      </div>
      <BotCards bots={bots} orgId={orgId} />
    </div>
  )
}
