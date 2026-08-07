import { z } from 'zod'
import { CONTENT_STATUSES } from '@/lib/content-studio/types'

const slug = z.string().trim().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, 'Use lowercase words separated by hyphens')
const requiredSlug = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens')

export const createContentItemSchema = z.object({
  mode: z.enum(['new', 'refresh']),
  title: z.string().trim().min(3, 'Add a working title').max(180),
  target_query: z.string().trim().min(2, 'Add a target query').max(180),
  topic: z.string().trim().min(1, 'Choose a topic'),
  search_intent: z.string().trim().min(2, 'Describe the search intent').max(240),
  reader_job: z.string().trim().min(2, 'Describe what the reader needs to accomplish').max(500),
  refresh_slug: z.string().trim().nullable().optional(),
  language: z.string().trim().min(2).max(10).default('en'),
  notes: z.string().trim().max(4000).default(''),
}).superRefine((value, context) => {
  if (value.mode === 'refresh' && !value.refresh_slug) {
    context.addIssue({ code: 'custom', path: ['refresh_slug'], message: 'Choose the article to refresh' })
  }
  if (value.mode === 'new' && value.refresh_slug) {
    context.addIssue({ code: 'custom', path: ['refresh_slug'], message: 'A new article cannot have a refresh slug' })
  }
})

export const updateContentDraftSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug,
  description: z.string().trim().max(320),
  topic: z.string().trim().min(1),
  target_query: z.string().trim().min(2).max(180),
  search_intent: z.string().trim().min(2).max(240),
  reader_job: z.string().trim().min(2).max(500),
  notes: z.string().trim().max(4000),
  markdown: z.string().max(200_000),
  related_slugs: z.array(requiredSlug).max(12),
  cover_image_alt: z.string().trim().max(240),
  cover_image_prompt: z.string().trim().max(2000),
  expectedRevision: z.number().int().positive(),
})

export const contentStatusSchema = z.enum(CONTENT_STATUSES)

export const generateContentPackageSchema = z.object({
  id: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
})

const publicationProviderSchema = z.enum(['website', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'])
const publicationTypeSchema = z.enum(['article', 'social_post', 'video'])

export const saveContentStudioSettingsSchema = z.object({
  proactive_suggestions: z.boolean(),
  default_approval_mode: z.enum(['review', 'auto_publish']),
  targets: z.array(z.object({
    provider: publicationProviderSchema,
    slot_key: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/),
    account_label: z.string().trim().max(120),
    account_handle: z.string().trim().max(200),
    enabled: z.boolean(),
    approval_mode: z.enum(['review', 'auto_publish']),
    content_types: z.array(publicationTypeSchema).min(1).max(3),
  })).length(6),
}).superRefine((value, context) => {
  const allowed = {
    website: ['article', 'video'],
    linkedin: ['article', 'social_post', 'video'],
    facebook: ['article', 'social_post', 'video'],
    instagram: ['social_post', 'video'],
    youtube: ['video'],
    tiktok: ['video'],
  } as const
  const providers = value.targets.map((target) => target.provider)
  if (new Set(providers).size !== 6) {
    context.addIssue({ code: 'custom', path: ['targets'], message: 'Configure each publishing provider exactly once' })
  }
  value.targets.forEach((target, index) => {
    const supported = allowed[target.provider] as readonly string[]
    if (target.content_types.some((type) => !supported.includes(type))) {
      context.addIssue({ code: 'custom', path: ['targets', index, 'content_types'], message: `${target.provider} does not support that content type` })
    }
  })
})

export function slugifyContentTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}
