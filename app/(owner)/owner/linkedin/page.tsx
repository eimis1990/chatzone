import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { LinkedInBoard } from '@/components/owner/LinkedInBoard'
import type { LinkedInPost } from '@/lib/types'

export const metadata = { title: 'LinkedIn — Owner | Loqara' }

export default async function LinkedInPage() {
  await requireRole('owner')

  const svc = createServiceClient()
  const { data } = await svc
    .from('linkedin_posts')
    .select('*')
    .order('status')
    .order('sort_order')
    .order('created_at')

  const posts = (data ?? []) as LinkedInPost[]

  return (
    <div className="h-full min-h-0 p-6">
      <LinkedInBoard initialPosts={posts} />
    </div>
  )
}
