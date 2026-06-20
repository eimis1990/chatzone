import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { VoicesPanel } from '@/components/owner/VoicesPanel'
import { Toaster } from '@/components/ui/sonner'
import type { PlatformVoice } from '@/lib/types'

export const metadata = { title: 'Voices — Owner | Chatzone' }

export default async function VoicesPage() {
  await requireRole('owner')

  const svc = createServiceClient()
  const { data } = await svc
    .from('platform_voices')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const voices = (data ?? []) as PlatformVoice[]

  return (
    <div className="max-w-3xl mx-auto">
      <VoicesPanel initialVoices={voices} />
      <Toaster />
    </div>
  )
}
