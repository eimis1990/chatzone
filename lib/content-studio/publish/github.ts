import 'server-only'
import { getEnv } from '@/lib/env'
import { getPublicationPaths, buildPullRequestBody, publicationDateFromExisting, serializePublicationMarkdown } from '@/lib/content-studio/publish/files'
import type {
  GitHubContentConfig,
  GitHubPublicationResult,
  GitHubPullRequestStatus,
  PublishContentInput,
} from '@/lib/content-studio/publish/types'

const GITHUB_API = 'https://api.github.com'
const GITHUB_API_VERSION = '2026-03-10'

interface GitHubRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  allowNotFound?: boolean
}

interface GitHubResponse<T> {
  data: T | null
  status: number
}

function encodeRepoPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function safeGitHubMessage(value: unknown): string {
  const raw = typeof value === 'object' && value && 'message' in value
    ? String((value as { message: unknown }).message)
    : 'GitHub request failed'
  return raw
    .replace(/(?:gh[opusr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g, '[credential]')
    .replace(/authorization\s*:?\s*(?:bearer\s+)?[^\s,;]+/gi, 'authorization [redacted]')
    .slice(0, 500)
}

class GitHubContentClient {
  readonly owner: string
  readonly repo: string

  constructor(
    private readonly config: GitHubContentConfig,
    private readonly fetchImpl: typeof fetch,
  ) {
    const [owner, repo] = config.repository.split('/')
    this.owner = owner
    this.repo = repo
  }

  async request<T>(path: string, options: GitHubRequestOptions = {}): Promise<GitHubResponse<T>> {
    const response = await this.fetchImpl(`${GITHUB_API}/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.config.token}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    })
    if (response.status === 404 && options.allowNotFound) return { data: null, status: 404 }
    const payload = await response.json().catch(() => null) as T | { message?: string } | null
    if (!response.ok) throw new Error(`GitHub ${response.status}: ${safeGitHubMessage(payload)}`)
    return { data: payload as T, status: response.status }
  }
}

export function getGitHubContentConfig(): GitHubContentConfig {
  const env = getEnv()
  if (!env.GITHUB_CONTENT_TOKEN || !env.GITHUB_CONTENT_REPOSITORY || !env.GITHUB_CONTENT_BASE_BRANCH) {
    throw new Error('GitHub publishing is not configured. Add the Content Studio GitHub token, repository, and base branch.')
  }
  return {
    token: env.GITHUB_CONTENT_TOKEN,
    repository: env.GITHUB_CONTENT_REPOSITORY as `${string}/${string}`,
    baseBranch: env.GITHUB_CONTENT_BASE_BRANCH,
  }
}

export function isGitHubPublishingConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_CONTENT_TOKEN
    && process.env.GITHUB_CONTENT_REPOSITORY
    && process.env.GITHUB_CONTENT_BASE_BRANCH,
  )
}

function decodeContent(value: { content?: string; encoding?: string } | null): string {
  if (!value?.content || value.encoding !== 'base64') throw new Error('GitHub returned an unreadable article file')
  return Buffer.from(value.content.replace(/\n/g, ''), 'base64').toString('utf8')
}

function pullStatus(pull: {
  number: number
  html_url: string
  state: 'open' | 'closed'
  draft: boolean
  merged_at: string | null
  head: { sha: string }
}): GitHubPullRequestStatus {
  return {
    number: pull.number,
    url: pull.html_url,
    state: pull.state,
    draft: pull.draft,
    merged: Boolean(pull.merged_at),
    mergedAt: pull.merged_at,
    headSha: pull.head.sha,
  }
}

export async function publishContentToGitHub(
  input: PublishContentInput,
  config = getGitHubContentConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<GitHubPublicationResult> {
  const client = new GitHubContentClient(config, fetchImpl)
  const paths = getPublicationPaths(input.item)
  const today = (input.now ?? new Date()).toISOString().slice(0, 10)
  const baseRef = await client.request<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(config.baseBranch)}`)
  const baseSha = baseRef.data!.object.sha

  const existingContent = await client.request<{ content?: string; encoding?: string }>(
    `/contents/${encodeRepoPath(paths.markdownPath)}?ref=${encodeURIComponent(config.baseBranch)}`,
    { allowNotFound: true },
  )
  if (input.item.mode === 'new' && existingContent.data) {
    throw new Error(`The slug ${input.item.slug} already exists on ${config.baseBranch}. Choose a different slug.`)
  }
  if (input.item.mode === 'refresh' && !existingContent.data) {
    throw new Error(`The refresh source ${input.item.slug} no longer exists on ${config.baseBranch}.`)
  }
  const publicationDate = input.item.mode === 'refresh'
    ? publicationDateFromExisting(decodeContent(existingContent.data))
    : today

  const branchRefPath = `/git/ref/heads/${encodeURIComponent(paths.branch)}`
  const branchRef = await client.request<{ object: { sha: string } }>(branchRefPath, { allowNotFound: true })
  const openPulls = await client.request<Array<{
    number: number
    html_url: string
    state: 'open' | 'closed'
    draft: boolean
    merged_at: string | null
    head: { sha: string }
  }>>(`/pulls?state=open&head=${encodeURIComponent(`${client.owner}:${paths.branch}`)}`)
  if (openPulls.data?.[0]) {
    const existing = pullStatus(openPulls.data[0])
    return {
      pullRequestUrl: existing.url,
      pullRequestNumber: existing.number,
      branch: paths.branch,
      commitSha: existing.headSha,
      baseSha,
      reused: true,
    }
  }

  const baseCommit = await client.request<{ tree: { sha: string } }>(`/git/commits/${encodeURIComponent(baseSha)}`)
  const markdown = serializePublicationMarkdown(input.item, publicationDate, today)
  const markdownBlob = await client.request<{ sha: string }>('/git/blobs', {
    method: 'POST',
    body: { content: Buffer.from(markdown, 'utf8').toString('base64'), encoding: 'base64' },
  })
  const treeEntries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [{
    path: paths.markdownPath,
    mode: '100644',
    type: 'blob',
    sha: markdownBlob.data!.sha,
  }]
  if (input.cover) {
    const imageBlob = await client.request<{ sha: string }>('/git/blobs', {
      method: 'POST',
      body: { content: Buffer.from(input.cover.bytes).toString('base64'), encoding: 'base64' },
    })
    treeEntries.push({ path: paths.imagePath, mode: '100644', type: 'blob', sha: imageBlob.data!.sha })
  }

  const tree = await client.request<{ sha: string }>('/git/trees', {
    method: 'POST',
    body: { base_tree: baseCommit.data!.tree.sha, tree: treeEntries },
  })
  const commit = await client.request<{ sha: string }>('/git/commits', {
    method: 'POST',
    body: {
      message: `${input.item.mode === 'refresh' ? 'refresh' : 'add'} blog article: ${input.item.slug}`,
      tree: tree.data!.sha,
      parents: [baseSha],
    },
  })

  if (branchRef.data) {
    await client.request(`/git/refs/heads/${encodeURIComponent(paths.branch)}`, {
      method: 'PATCH',
      body: { sha: commit.data!.sha, force: true },
    })
  } else {
    await client.request('/git/refs', {
      method: 'POST',
      body: { ref: `refs/heads/${paths.branch}`, sha: commit.data!.sha },
    })
  }

  const pull = await client.request<{
    number: number
    html_url: string
    head: { sha: string }
  }>('/pulls', {
    method: 'POST',
    body: {
      title: `[Content] ${input.item.title}`.slice(0, 240),
      head: paths.branch,
      base: config.baseBranch,
      body: buildPullRequestBody(input.item, input.sources, input.checks),
      draft: true,
    },
  })

  return {
    pullRequestUrl: pull.data!.html_url,
    pullRequestNumber: pull.data!.number,
    branch: paths.branch,
    commitSha: pull.data!.head?.sha ?? commit.data!.sha,
    baseSha,
    reused: false,
  }
}

export async function getGitHubPullRequestStatus(
  number: number,
  config = getGitHubContentConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<GitHubPullRequestStatus> {
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('The stored pull request number is invalid')
  const client = new GitHubContentClient(config, fetchImpl)
  const result = await client.request<{
    number: number
    html_url: string
    state: 'open' | 'closed'
    draft: boolean
    merged_at: string | null
    head: { sha: string }
  }>(`/pulls/${number}`)
  return pullStatus(result.data!)
}
