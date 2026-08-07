import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import type { ContentPublicationTarget, ContentStudioSettings } from '@/lib/content-studio/types'
import { defaultContentStudioSettings, mergePublicationTargets } from '@/lib/content-studio/publication'
import { ContentSettingsForm } from '@/components/owner/content/ContentSettingsForm'

export const metadata = { title: 'Content settings — Owner | Loqara' }

export default async function ContentSettingsPage() {
  const user = await requireRole('owner')
  const service = createServiceClient()
  const [{ data: storedSettings, error: settingsError }, { data: storedTargets, error: targetsError }] = await Promise.all([
    service.from('content_studio_settings').select('*').eq('owner_id', user.id).maybeSingle<ContentStudioSettings>(),
    service.from('content_publication_targets').select('*').eq('owner_id', user.id).order('provider'),
  ])

  if (settingsError) throw new Error(`Failed to load Content Studio settings: ${settingsError.message}`)
  if (targetsError) throw new Error(`Failed to load publishing destinations: ${targetsError.message}`)

  const settings = storedSettings ?? defaultContentStudioSettings(user.id)
  const targets = mergePublicationTargets(
    user.id,
    (storedTargets ?? []) as ContentPublicationTarget[],
    settings.default_approval_mode,
  )

  return (
    <div className="min-h-full p-4 sm:p-6">
      <ContentSettingsForm initialSettings={settings} initialTargets={targets} />
    </div>
  )
}
