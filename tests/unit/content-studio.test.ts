import { describe, expect, it } from 'vitest'
import { canTransitionContentStatus, contentStatusAfterDraftEdit } from '@/lib/content-studio/lifecycle'
import { createContentItemSchema, slugifyContentTitle, updateContentDraftSchema } from '@/lib/content-studio/validation'
import { saveContentStudioSettingsSchema } from '@/lib/content-studio/validation'
import { defaultContentStudioSettings, defaultPublicationTargets } from '@/lib/content-studio/publication'
import { getContentSuggestions } from '@/lib/content-studio/suggestions'
import type { ContentItem } from '@/lib/content-studio/types'

describe('Content Studio lifecycle', () => {
  it('allows human review to send a draft back for editing', () => {
    expect(canTransitionContentStatus('drafting', 'review')).toBe(true)
    expect(canTransitionContentStatus('review', 'drafting')).toBe(true)
  })

  it('does not allow an idea to skip directly to published', () => {
    expect(canTransitionContentStatus('idea', 'published')).toBe(false)
  })

  it('invalidates Ready approval after any article edit', () => {
    expect(contentStatusAfterDraftEdit('ready')).toBe('review')
    expect(contentStatusAfterDraftEdit('drafting')).toBe('drafting')
  })
})

describe('Content Studio validation', () => {
  it('requires a source article for refresh mode', () => {
    const result = createContentItemSchema.safeParse({
      mode: 'refresh',
      title: 'Refresh the chatbot pricing guide',
      target_query: 'AI chatbot cost',
      topic: 'vendor-comparisons',
      search_intent: 'Compare likely costs',
      reader_job: 'Build a realistic shortlist and budget',
      refresh_slug: null,
    })
    expect(result.success).toBe(false)
  })

  it('validates optimistic revision and related slugs', () => {
    const result = updateContentDraftSchema.safeParse({
      title: 'A useful guide',
      slug: 'a-useful-guide',
      description: '',
      topic: 'ecommerce-ai',
      target_query: 'useful guide',
      search_intent: 'Learn',
      reader_job: 'Make a decision',
      notes: '',
      markdown: '# Draft',
      related_slugs: ['valid-related-guide'],
      cover_image_alt: '',
      cover_image_prompt: '',
      expectedRevision: 2,
    })
    expect(result.success).toBe(true)
  })

  it('creates conservative ASCII URL slugs', () => {
    expect(slugifyContentTitle(' AI Content: A Practical Guide! ')).toBe('ai-content-a-practical-guide')
  })
})

describe('Content Studio automation', () => {
  const ownerId = '10000000-0000-4000-8000-000000000001'

  it('defaults every destination to disabled and waiting for review', () => {
    const settings = defaultContentStudioSettings(ownerId)
    const targets = defaultPublicationTargets(ownerId)

    expect(settings.proactive_suggestions).toBe(true)
    expect(settings.default_approval_mode).toBe('review')
    expect(targets).toHaveLength(6)
    expect(targets.every((target) => !target.enabled && target.approval_mode === 'review')).toBe(true)
  })

  it('rejects unsupported destination content types', () => {
    const targets = defaultPublicationTargets(ownerId).map((target) => ({
      provider: target.provider,
      slot_key: target.slot_key,
      account_label: target.account_label,
      account_handle: target.account_handle,
      enabled: target.enabled,
      approval_mode: target.approval_mode,
      content_types: target.provider === 'youtube' ? ['article' as const] : target.content_types,
    }))
    const result = saveContentStudioSettingsSchema.safeParse({
      proactive_suggestions: true,
      default_approval_mode: 'review',
      targets,
    })
    expect(result.success).toBe(false)
  })

  it('recommends starting an idea with a one-click drafting transition', () => {
    const item = {
      id: '10000000-0000-4000-8000-000000000010',
      title: 'AI shopping assistant guide',
      status: 'idea',
      updated_at: '2026-08-07T10:00:00.000Z',
    } as ContentItem
    const suggestions = getContentSuggestions([item], defaultPublicationTargets(ownerId))

    expect(suggestions[0]).toMatchObject({
      itemId: item.id,
      transitionTo: 'drafting',
      actionLabel: 'Start drafting',
    })
    expect(suggestions.some((suggestion) => suggestion.href === '/owner/content/settings')).toBe(true)
  })
})
