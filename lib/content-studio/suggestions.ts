import type { ContentItem, ContentPublicationTarget, ContentStatus } from '@/lib/content-studio/types'

export interface ContentSuggestion {
  id: string
  title: string
  description: string
  actionLabel: string
  href: string
  priority: number
  itemId?: string
  transitionTo?: ContentStatus
}

function newest(items: ContentItem[]): ContentItem | undefined {
  return [...items].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
}

export function getContentSuggestions(
  items: ContentItem[],
  targets: ContentPublicationTarget[],
): ContentSuggestion[] {
  const suggestions: ContentSuggestion[] = []
  const failed = newest(items.filter((item) => item.status === 'failed'))
  const review = newest(items.filter((item) => item.status === 'review'))
  const ready = newest(items.filter((item) => item.status === 'ready'))
  const drafting = newest(items.filter((item) => ['drafting', 'brief'].includes(item.status)))
  const idea = newest(items.filter((item) => item.status === 'idea'))

  if (failed) suggestions.push({
    id: `failed-${failed.id}`,
    title: `Fix “${failed.title}”`,
    description: 'This workflow needs attention before automation can continue.',
    actionLabel: 'Resolve issue',
    href: `/owner/content/${failed.id}`,
    priority: 100,
    itemId: failed.id,
  })
  if (review) suggestions.push({
    id: `review-${review.id}`,
    title: `Review “${review.title}”`,
    description: 'The draft is waiting for your decision, not another automated step.',
    actionLabel: 'Review now',
    href: `/owner/content/${review.id}`,
    priority: 90,
    itemId: review.id,
  })
  if (ready) suggestions.push({
    id: `ready-${ready.id}`,
    title: `Create the review PR for “${ready.title}”`,
    description: 'The article passed its required gates and is waiting for the GitHub publishing handoff.',
    actionLabel: 'Open publishing step',
    href: `/owner/content/${ready.id}`,
    priority: 80,
    itemId: ready.id,
  })
  if (drafting) suggestions.push({
    id: `draft-${drafting.id}`,
    title: `Continue “${drafting.title}”`,
    description: 'This is the most recently active draft and the fastest item to move forward.',
    actionLabel: 'Continue writing',
    href: `/owner/content/${drafting.id}`,
    priority: 70,
    itemId: drafting.id,
  })
  if (idea) suggestions.push({
    id: `idea-${idea.id}`,
    title: `Start “${idea.title}”`,
    description: 'Move the idea into drafting and open its workspace in one step.',
    actionLabel: 'Start drafting',
    href: `/owner/content/${idea.id}`,
    priority: 60,
    itemId: idea.id,
    transitionTo: 'drafting',
  })

  const enabled = targets.filter((target) => target.enabled)
  const incomplete = enabled.filter((target) => target.connector_status !== 'connected')
  if (enabled.length === 0) suggestions.push({
    id: 'configure-destinations',
    title: 'Choose where finished content should go',
    description: 'Set website and social destinations now; every destination waits for review by default.',
    actionLabel: 'Configure destinations',
    href: '/owner/content/settings',
    priority: 40,
  })
  else if (incomplete.length > 0) suggestions.push({
    id: 'finish-connectors',
    title: `${incomplete.length} publishing ${incomplete.length === 1 ? 'connector needs' : 'connectors need'} setup`,
    description: 'Your policies are saved, but nothing will post until the destination connectors are ready.',
    actionLabel: 'View setup',
    href: '/owner/content/settings',
    priority: 50,
  })

  if (items.length === 0) suggestions.push({
    id: 'create-first-article',
    title: 'Create the first article brief',
    description: 'Choose a reader goal and query; the Studio will keep recommending the next useful action.',
    actionLabel: 'New article',
    href: '/owner/content/new',
    priority: 85,
  })

  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 3)
}
