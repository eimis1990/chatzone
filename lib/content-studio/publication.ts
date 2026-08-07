import type {
  ContentApprovalMode,
  ContentPublicationProvider,
  ContentPublicationTarget,
  ContentPublicationType,
  ContentStudioSettings,
} from '@/lib/content-studio/types'

export interface PublicationProviderDefinition {
  provider: ContentPublicationProvider
  name: string
  description: string
  supportedTypes: ContentPublicationType[]
}

export const PUBLICATION_PROVIDERS: PublicationProviderDefinition[] = [
  { provider: 'website', name: 'Loqara website', description: 'Long-form articles in the Loqara blog.', supportedTypes: ['article', 'video'] },
  { provider: 'linkedin', name: 'LinkedIn', description: 'Company or personal profile posts and video.', supportedTypes: ['social_post', 'article', 'video'] },
  { provider: 'facebook', name: 'Facebook', description: 'Page posts, article links, and video.', supportedTypes: ['social_post', 'article', 'video'] },
  { provider: 'instagram', name: 'Instagram', description: 'Feed captions, carousels, and video.', supportedTypes: ['social_post', 'video'] },
  { provider: 'youtube', name: 'YouTube', description: 'Long-form and short-form video publishing.', supportedTypes: ['video'] },
  { provider: 'tiktok', name: 'TikTok', description: 'Short-form video publishing.', supportedTypes: ['video'] },
]

export const CONTENT_TYPE_LABELS: Record<ContentPublicationType, string> = {
  article: 'Articles',
  social_post: 'Social posts',
  video: 'Videos',
}

export function defaultContentStudioSettings(ownerId: string): ContentStudioSettings {
  return {
    owner_id: ownerId,
    proactive_suggestions: true,
    default_approval_mode: 'review',
    created_at: null,
    updated_at: null,
  }
}

function defaultTypes(provider: PublicationProviderDefinition): ContentPublicationType[] {
  if (provider.provider === 'website') return ['article']
  if (provider.supportedTypes.includes('social_post')) return ['social_post']
  return ['video']
}

export function defaultPublicationTargets(
  ownerId: string,
  approvalMode: ContentApprovalMode = 'review',
): ContentPublicationTarget[] {
  return PUBLICATION_PROVIDERS.map((definition) => ({
    id: null,
    owner_id: ownerId,
    provider: definition.provider,
    slot_key: 'default',
    account_label: '',
    account_handle: '',
    enabled: false,
    approval_mode: approvalMode,
    content_types: defaultTypes(definition),
    connector_status: 'not_connected',
    connector_account_id: null,
    connector_error: null,
    created_at: null,
    updated_at: null,
  }))
}

export function mergePublicationTargets(
  ownerId: string,
  stored: ContentPublicationTarget[],
  approvalMode: ContentApprovalMode = 'review',
): ContentPublicationTarget[] {
  const byProvider = new Map(stored.map((target) => [target.provider, target]))
  return defaultPublicationTargets(ownerId, approvalMode).map((fallback) => byProvider.get(fallback.provider) ?? fallback)
}
