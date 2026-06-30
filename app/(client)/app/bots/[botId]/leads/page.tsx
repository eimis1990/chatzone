import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { ExportLeadsButton } from '@/components/client/ExportLeadsButton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { Bot, Lead } from '@/lib/types'

export default async function LeadsPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()

  // RLS: bot must belong to user's org
  const { data: bot } = await supabase
    .from('bots')
    .select('id, name')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name'>>()

  if (!bot) notFound()

  const { data: rawLeads } = await supabase
    .from('leads')
    .select('id, bot_id, conversation_id, fields, created_at')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })

  const leads = (rawLeads ?? []) as Lead[]

  // Derive the union of all field keys across all leads (preserves insertion order)
  const fieldColumns = Array.from(
    new Set(leads.flatMap((lead) => Object.keys(lead.fields))),
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Leads</h2>
          <p className="text-sm text-muted-foreground">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} captured
          </p>
        </div>
        <ExportLeadsButton leads={leads} columns={fieldColumns} botName={bot.name} />
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card py-20 text-center">
          <p className="font-medium text-foreground">No leads captured yet</p>
          <p className="text-sm text-muted-foreground">
            Leads are captured when visitors fill in your bot&apos;s lead-capture form.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 text-xs font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground">
                  Captured
                </TableHead>
                {fieldColumns.map((col) => (
                  <TableHead
                    key={col}
                    className="px-4 text-xs font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground"
                  >
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell
                    className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground"
                    title={new Date(lead.created_at).toLocaleString()}
                  >
                    {formatDistanceToNow(lead.created_at)}
                  </TableCell>
                  {fieldColumns.map((col) => (
                    <TableCell key={col} className="px-4 py-3 text-sm">
                      {lead.fields[col] ?? '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
