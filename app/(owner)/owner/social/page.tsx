import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { SocialBoards } from '@/components/owner/SocialBoards'
import type { SocialPost } from '@/lib/types'

export const metadata = { title: 'Facebook / Instagram — Owner | Loqara' }

export default async function SocialPage() {
  await requireRole('owner')

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('social_posts')
    .select('*')
    .order('platform')
    .order('status')
    .order('sort_order')
    .order('created_at')

  if (error) throw new Error(`Failed to load social posts: ${error.message}`)

  return (
    <div className="h-full min-h-0 p-4 sm:p-6">
      <SocialBoards initialPosts={(data ?? []) as SocialPost[]} />
    </div>
  )
}
