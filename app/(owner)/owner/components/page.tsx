import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { COMPONENT_FOLDERS } from '@/lib/widget-components/folders'
import { ProviderFolders } from '@/components/owner/ProviderFolders'

/**
 * Component library — one folder per commerce provider (+ Core). A folder
 * holds the widget components AVAILABLE to bots on that provider; bots pick a
 * variant on their own Components page. The catalog itself lives in code
 * (lib/widget-components/meta.ts); folders appear automatically when a
 * provider is added to the CommerceProvider union.
 */
export default async function ComponentsPage() {
  await requireRole('owner')
  const supabase = await createServerClient()
  const { data } = await supabase.from('provider_components').select('provider')

  const counts: Record<string, number> = {}
  for (const row of data ?? []) counts[row.provider] = (counts[row.provider] ?? 0) + 1

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Components</h1>
        <p className="text-sm text-muted-foreground">
          What each store platform&apos;s bots may render in chat. Adding a component here makes it
          available — each bot still picks its own variant on its Components page.
        </p>
      </div>
      <ProviderFolders folders={COMPONENT_FOLDERS.map((f) => ({ ...f, count: counts[f.id] ?? 0 }))} />
    </div>
  )
}
