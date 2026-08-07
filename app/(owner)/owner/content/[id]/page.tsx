import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { BLOG_TOPICS } from '@/lib/blog-topics'
import type { ContentItem, ContentSource, ContentVariant } from '@/lib/content-studio/types'
import { ArticleWorkspace } from '@/components/owner/content/ArticleWorkspace'
import { isGitHubPublishingConfigured } from '@/lib/content-studio/publish/github'
import '@/components/blog/article.css'

export const metadata = { title: 'Article workspace — Content Studio | Loqara' }
export const maxDuration = 300

export default async function ContentItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('owner')
  const { id } = await params
  const service = createServiceClient()
  const [itemResult, sourcesResult, variantsResult] = await Promise.all([
    service.from('content_items').select('*').eq('id', id).maybeSingle<ContentItem>(),
    service.from('content_sources').select('*').eq('content_item_id', id).order('fetched_at', { ascending: false }),
    service.from('content_variants').select('*').eq('content_item_id', id).order('provider'),
  ])

  if (itemResult.error) throw new Error(`Failed to load article: ${itemResult.error.message}`)
  if (!itemResult.data) notFound()
  if (sourcesResult.error) throw new Error(`Failed to load article sources: ${sourcesResult.error.message}`)
  if (variantsResult.error) throw new Error(`Failed to load destination drafts: ${variantsResult.error.message}`)

  const data = itemResult.data
  const sources = (sourcesResult.data ?? []) as ContentSource[]
  const variants = (variantsResult.data ?? []) as ContentVariant[]
  let coverImageUrl: string | null = null
  if (data.cover_image_path?.startsWith('/blog/')) {
    coverImageUrl = data.cover_image_path
  } else if (data.cover_image_path) {
    const { data: signed } = await service.storage.from('content-studio').createSignedUrl(data.cover_image_path, 60 * 60)
    coverImageUrl = signed?.signedUrl ?? null
  }

  return (
    <div className="h-full min-h-0 p-3 sm:p-4 lg:p-6">
      <ArticleWorkspace
        initialItem={data}
        initialSources={sources}
        initialVariants={variants}
        initialCoverImageUrl={coverImageUrl}
        publicationConfigured={isGitHubPublishingConfigured()}
        topics={BLOG_TOPICS.map((topic) => ({ slug: topic.slug, name: topic.name }))}
      />
    </div>
  )
}
