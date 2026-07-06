import { TargetIcon } from 'lucide-react'
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <TargetIcon className="size-5 text-primary" aria-hidden="true" />
          Sales leads
        </h1>
        <p className="text-sm text-muted-foreground">
          Researched prospects ranked by chance to close, each with a ready-to-send cold email.
        </p>
      </div>

      <SalesLeadsTable leads={leads} />
    </div>
  )
}
