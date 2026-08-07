import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import type { ContentActiveRun, ContentItem } from '@/lib/content-studio/types'
import type { ContentPublicationTarget, ContentStudioSettings } from '@/lib/content-studio/types'
import { defaultContentStudioSettings, mergePublicationTargets } from '@/lib/content-studio/publication'
import { ContentPipeline } from '@/components/owner/content/ContentPipeline'

export const metadata = { title: 'Content Studio — Owner | Loqara' }

export default async function ContentStudioPage() {
  const user = await requireRole('owner')
  const service = createServiceClient()
  const [itemsResult, settingsResult, targetsResult] = await Promise.all([
    service.from('content_items').select('*').eq('created_by', user.id).order('updated_at', { ascending: false }),
    service.from('content_studio_settings').select('*').eq('owner_id', user.id).maybeSingle<ContentStudioSettings>(),
    service.from('content_publication_targets').select('*').eq('owner_id', user.id),
  ])

  if (itemsResult.error) throw new Error(`Failed to load Content Studio: ${itemsResult.error.message}`)
  if (settingsResult.error) throw new Error(`Failed to load Content Studio settings: ${settingsResult.error.message}`)
  if (targetsResult.error) throw new Error(`Failed to load publishing destinations: ${targetsResult.error.message}`)

  const items = (itemsResult.data ?? []) as ContentItem[]
  const itemIds = items.map((item) => item.id)
  const activeRunsResult = itemIds.length > 0
    ? await service
      .from('content_generation_runs')
      .select('id, content_item_id, operation, status, created_at, started_at')
      .in('content_item_id', itemIds)
      .in('status', ['queued', 'in_progress'])
      .order('created_at', { ascending: false })
    : { data: [], error: null }

  if (activeRunsResult.error) throw new Error(`Failed to load Content Studio activity: ${activeRunsResult.error.message}`)
  const activeRuns = (activeRunsResult.data ?? []) as ContentActiveRun[]
  const pipelineVersion = [
    ...items.map((item) => `${item.id}:${item.updated_at}`),
    ...activeRuns.map((run) => `${run.id}:${run.status}`),
  ].join('|')

  const settings = settingsResult.data ?? defaultContentStudioSettings(user.id)
  const targets = mergePublicationTargets(
    user.id,
    (targetsResult.data ?? []) as ContentPublicationTarget[],
    settings.default_approval_mode,
  )

  return (
    <div className="h-full min-h-0 p-4 sm:p-6">
      <ContentPipeline
        key={pipelineVersion}
        initialItems={items}
        initialActiveRuns={activeRuns}
        proactiveSuggestions={settings.proactive_suggestions}
        targets={targets}
      />
    </div>
  )
}
