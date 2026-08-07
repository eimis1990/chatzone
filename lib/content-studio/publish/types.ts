import type { ContentItem, ContentQualityCheck, ContentSource } from '@/lib/content-studio/types'

export interface GitHubContentConfig {
  token: string
  repository: `${string}/${string}`
  baseBranch: string
}

export interface PublicationAsset {
  bytes: Uint8Array
  mediaType: 'image/webp'
}

export interface PublishContentInput {
  item: ContentItem
  sources: ContentSource[]
  checks: ContentQualityCheck[]
  cover: PublicationAsset | null
  now?: Date
}

export interface GitHubPublicationResult {
  pullRequestUrl: string
  pullRequestNumber: number
  branch: string
  commitSha: string
  baseSha: string
  reused: boolean
}

export interface GitHubPullRequestStatus {
  number: number
  url: string
  state: 'open' | 'closed'
  draft: boolean
  merged: boolean
  mergedAt: string | null
  headSha: string
}
