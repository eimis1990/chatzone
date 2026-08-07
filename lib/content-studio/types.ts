export const CONTENT_STATUSES = [
  'idea',
  'researching',
  'brief',
  'drafting',
  'review',
  'ready',
  'pr_open',
  'published',
  'failed',
  'archived',
] as const

export type ContentStatus = (typeof CONTENT_STATUSES)[number]
export type ContentMode = 'new' | 'refresh'
export type ContentApprovalMode = 'review' | 'auto_publish'
export type ContentConnectorStatus = 'not_connected' | 'connected' | 'error'
export type ContentPublicationProvider = 'website' | 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'tiktok'
export type ContentPublicationType = 'article' | 'social_post' | 'video'
export type ContentVariantStatus = 'draft' | 'review' | 'approved'
export type ContentQualitySeverity = 'required' | 'recommended'
export type ContentGenerationOperation = 'research' | 'brief' | 'draft' | 'image' | 'publish'
export type ContentGenerationRunStatus = 'queued' | 'in_progress' | 'succeeded' | 'failed'

export interface ContentItem {
  id: string
  created_by: string
  mode: ContentMode
  status: ContentStatus
  title: string
  slug: string
  description: string
  topic: string
  target_query: string
  search_intent: string
  reader_job: string
  refresh_slug: string | null
  language: string
  notes: string
  markdown: string
  related_slugs: string[]
  cover_image_path: string | null
  cover_image_alt: string
  cover_image_prompt: string
  pull_request_url: string | null
  pull_request_number: number | null
  publication_branch: string | null
  publication_commit_sha: string | null
  publication_base_sha: string | null
  published_url: string | null
  revision: number
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface ContentActiveRun {
  id: string
  content_item_id: string
  operation: ContentGenerationOperation
  status: Extract<ContentGenerationRunStatus, 'queued' | 'in_progress'>
  created_at: string
  started_at: string | null
}

export interface CreateContentItemInput {
  mode: ContentMode
  title: string
  target_query: string
  topic: string
  search_intent: string
  reader_job: string
  refresh_slug?: string | null
  language?: string
  notes?: string
}

export interface UpdateContentDraftInput {
  title: string
  slug: string
  description: string
  topic: string
  target_query: string
  search_intent: string
  reader_job: string
  notes: string
  markdown: string
  related_slugs: string[]
  cover_image_alt: string
  cover_image_prompt: string
  expectedRevision: number
}

export interface ContentStudioSettings {
  owner_id: string
  proactive_suggestions: boolean
  default_approval_mode: ContentApprovalMode
  created_at: string | null
  updated_at: string | null
}

export interface ContentPublicationTarget {
  id: string | null
  owner_id: string
  provider: ContentPublicationProvider
  slot_key: string
  account_label: string
  account_handle: string
  enabled: boolean
  approval_mode: ContentApprovalMode
  content_types: ContentPublicationType[]
  connector_status: ContentConnectorStatus
  connector_account_id: string | null
  connector_error: string | null
  created_at: string | null
  updated_at: string | null
}

export interface SaveContentStudioSettingsInput {
  proactive_suggestions: boolean
  default_approval_mode: ContentApprovalMode
  targets: Array<Pick<ContentPublicationTarget,
    'provider' | 'slot_key' | 'account_label' | 'account_handle' | 'enabled' | 'approval_mode' | 'content_types'
  >>
}

export interface ContentSource {
  id: string
  content_item_id: string
  url: string
  title: string
  publisher: string
  excerpt: string
  source_kind: 'web' | 'internal' | 'competitor'
  fetched_at: string | null
  created_at: string
}

export interface ContentVariant {
  id: string
  content_item_id: string
  provider: Extract<ContentPublicationProvider, 'linkedin' | 'facebook' | 'instagram'>
  slot_key: string
  content_type: 'social_post'
  status: ContentVariantStatus
  headline: string
  body: string
  hashtags: string[]
  image_prompt: string
  created_at: string
  updated_at: string
}

export interface ContentQualityCheck {
  id: string
  label: string
  detail: string
  passed: boolean
  severity: ContentQualitySeverity
}

export interface GenerateContentPackageResult {
  item: ContentItem
  sources: ContentSource[]
  variants: ContentVariant[]
  checks: ContentQualityCheck[]
  coverImageUrl: string | null
  imageWarning: string | null
}

export interface GenerateContentCoverResult {
  coverImagePath: string
  coverImageUrl: string
  revision: number
}

export interface PublishContentResult {
  item: ContentItem
  reused: boolean
}

export interface PublicationReconciliationResult {
  item: ContentItem
  message: string
}
