import type { KnowledgeSource } from '@/lib/types'

/** Never present a failed attempt (updated_at) as a successful content update. */
export function knowledgeSourceDate(source: KnowledgeSource): { label: string; date: string } {
  const meta = source.metadata ?? {}
  const valid = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
  if (source.type === 'url' && valid(meta.lastCheckedAt) &&
      (!valid(meta.indexedAt) || Date.parse(meta.lastCheckedAt) >= Date.parse(meta.indexedAt))) {
    return { label: 'Checked', date: meta.lastCheckedAt }
  }
  if (valid(meta.indexedAt)) return { label: 'Updated', date: meta.indexedAt }
  // Legacy rows have no successful-operation timestamps. Be explicit about what we know.
  if (source.status === 'ready' && valid(source.updated_at)) return { label: 'Processed', date: source.updated_at }
  return { label: 'Added', date: source.created_at }
}
