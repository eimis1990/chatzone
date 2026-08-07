import type { ContentStatus } from '@/lib/content-studio/types'
import type { GitHubPullRequestStatus } from '@/lib/content-studio/publish/types'

export interface PublicationDecision {
  nextStatus: Extract<ContentStatus, 'pr_open' | 'ready' | 'published'>
  message: string
}

export function getPublicationDecision(
  pull: GitHubPullRequestStatus,
  liveArticleAvailable: boolean,
): PublicationDecision {
  if (pull.state === 'open') {
    return {
      nextStatus: 'pr_open',
      message: `Draft PR #${pull.number} is still open and waiting for GitHub review`,
    }
  }
  if (!pull.merged) {
    return {
      nextStatus: 'ready',
      message: `PR #${pull.number} closed without merging. The article is Ready to revise or publish again.`,
    }
  }
  if (!liveArticleAvailable) {
    return {
      nextStatus: 'pr_open',
      message: `PR #${pull.number} is merged. Waiting for the live article deployment before marking it Published.`,
    }
  }
  return {
    nextStatus: 'published',
    message: `PR #${pull.number} is merged and the live article is available`,
  }
}
