import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { ConfigForm } from '@/components/client/ConfigForm'
import { Toaster } from '@/components/ui/sonner'
import type { Bot } from '@/lib/types'

export default async function ConfigurePage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('bots')
    .select('id, name, config')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'config'>>()

  if (!data) notFound()

  return (
    <>
      <ConfigForm botId={data.id} botName={data.name} initialConfig={data.config} />
      <Toaster />
    </>
  )
}
