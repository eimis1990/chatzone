import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SettingsPanel } from '@/components/client/SettingsPanel'
import { entitlementsFor } from '@/lib/entitlements'
import type { Plan } from '@/lib/types'

export default async function SettingsPage() {
  await requireRole('client')
  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null

  let retentionDays: number | null = null
  let canCustomRetention = false
  if (orgId) {
    const sb = await createServerClient()
    const { data } = await sb
      .from('organizations')
      .select('retention_days, plan')
      .eq('id', orgId)
      .single<{ retention_days: number | null; plan: Plan | null }>()
    retentionDays = data?.retention_days ?? null
    canCustomRetention = entitlementsFor(data?.plan ?? 'free').customRetention
  }

  /** Set the org conversation-retention window (service client; org verified). */
  async function setRetention(days: number | null): Promise<void> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return
    const svc = createServiceClient()
    // Enforce the entitlement server-side — the UI control is also gated.
    const { data: org } = await svc
      .from('organizations')
      .select('plan')
      .eq('id', oid)
      .single<{ plan: Plan | null }>()
    if (!entitlementsFor(org?.plan ?? 'free').customRetention) return
    await svc.from('organizations').update({ retention_days: days }).eq('id', oid)
  }

  /** Erase org data (conversations+messages and/or leads). Org verified first. */
  async function deleteData(scope: 'conversations' | 'leads' | 'all'): Promise<{ ok: boolean }> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { ok: false }
    const svc = createServiceClient()
    const { data: bots } = await svc.from('bots').select('id').eq('org_id', oid)
    const botIds = (bots ?? []).map((b) => (b as { id: string }).id)
    if (!botIds.length) return { ok: true }
    if (scope === 'conversations' || scope === 'all') {
      await svc.from('conversations').delete().in('bot_id', botIds) // cascades messages
    }
    if (scope === 'leads' || scope === 'all') {
      await svc.from('leads').delete().in('bot_id', botIds)
    }
    return { ok: true }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Data retention, export, and privacy controls for your organization.
        </p>
      </div>

      <SettingsPanel
        retentionDays={retentionDays}
        setRetention={setRetention}
        deleteData={deleteData}
        canCustomRetention={canCustomRetention}
      />
    </div>
  )
}
