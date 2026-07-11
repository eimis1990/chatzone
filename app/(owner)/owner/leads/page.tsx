import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { SalesLeadsTable } from '@/components/owner/SalesLeadsTable'
import type { SalesLead } from '@/lib/types'

/**
 * Owner sales pipeline: researched Lithuanian prospects, ranked by a
 * chance-to-close score, each with a prepared cold email. Status moves through
 * ready → email sent → accepted/rejected → client.
 */
export default async function SalesLeadsPage() {
  await requireRole('owner')

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('sales_leads')
    .select('*')
    .order('score', { ascending: false })
    .order('name')
  const leads = (data ?? []) as SalesLead[]

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-lg font-semibold">Sales leads</h1>
        <p className="text-sm text-muted-foreground">
          Research, prioritize, and contact Lithuanian prospects.
        </p>
      </div>

      <SalesLeadsTable leads={leads} />
    </div>
  )
}
