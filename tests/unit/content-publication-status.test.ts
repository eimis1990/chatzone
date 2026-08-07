import { describe, expect, it } from 'vitest'
import { getPublicationDecision } from '@/lib/content-studio/publish/reconcile'
import type { GitHubPullRequestStatus } from '@/lib/content-studio/publish/types'

const pull: GitHubPullRequestStatus = {
  number: 42,
  url: 'https://github.com/eimis1990/chatzone/pull/42',
  state: 'open',
  draft: true,
  merged: false,
  mergedAt: null,
  headSha: 'a'.repeat(40),
}

describe('Content Studio publication reconciliation', () => {
  it('keeps an open draft PR in pr_open', () => {
    expect(getPublicationDecision(pull, false)).toMatchObject({ nextStatus: 'pr_open', message: expect.stringContaining('still open') })
  })

  it('returns a closed unmerged PR to Ready without deleting its metadata', () => {
    expect(getPublicationDecision({ ...pull, state: 'closed', draft: false }, false)).toMatchObject({
      nextStatus: 'ready',
      message: expect.stringContaining('closed without merging'),
    })
  })

  it('waits for deployment after merge and publishes only when the live URL resolves', () => {
    const merged = { ...pull, state: 'closed', draft: false, merged: true, mergedAt: '2026-08-08T10:00:00.000Z' } satisfies GitHubPullRequestStatus
    expect(getPublicationDecision(merged, false).nextStatus).toBe('pr_open')
    expect(getPublicationDecision(merged, true).nextStatus).toBe('published')
  })
})
