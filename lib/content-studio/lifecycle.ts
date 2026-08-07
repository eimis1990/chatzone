import type { ContentStatus } from '@/lib/content-studio/types'

const FORWARD_TRANSITIONS: Record<ContentStatus, readonly ContentStatus[]> = {
  idea: ['researching', 'brief', 'drafting', 'archived'],
  researching: ['brief', 'failed', 'archived'],
  brief: ['drafting', 'failed', 'archived'],
  drafting: ['review', 'failed', 'archived'],
  review: ['drafting', 'ready', 'archived'],
  ready: ['review', 'pr_open', 'archived'],
  pr_open: ['ready', 'published', 'failed', 'archived'],
  published: ['archived'],
  failed: ['idea', 'researching', 'brief', 'drafting', 'ready', 'archived'],
  archived: ['idea'],
}

export function canTransitionContentStatus(from: ContentStatus, to: ContentStatus): boolean {
  return from === to || FORWARD_TRANSITIONS[from].includes(to)
}

export function assertContentStatusTransition(from: ContentStatus, to: ContentStatus): void {
  if (!canTransitionContentStatus(from, to)) {
    throw new Error(`Cannot move content from ${from} to ${to}`)
  }
}

/** Any edit after final approval invalidates Ready; published/PR states are locked by the action. */
export function contentStatusAfterDraftEdit(status: ContentStatus): ContentStatus {
  return status === 'ready' ? 'review' : status
}

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  idea: 'Idea',
  researching: 'Researching',
  brief: 'Brief ready',
  drafting: 'Drafting',
  review: 'In review',
  ready: 'Ready',
  pr_open: 'PR open',
  published: 'Published',
  failed: 'Needs attention',
  archived: 'Archived',
}
