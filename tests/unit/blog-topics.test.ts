import { describe, it, expect } from 'vitest'
import { getAllPosts, getPostsByTopic } from '@/lib/blog'
import { BLOG_TOPICS, TOPIC_SLUGS, getTopic } from '@/lib/blog-topics'

describe('topic taxonomy', () => {
  const posts = getAllPosts()

  it('stays a small controlled vocabulary (no tag explosion)', () => {
    expect(BLOG_TOPICS.length).toBeGreaterThanOrEqual(4)
    expect(BLOG_TOPICS.length).toBeLessThanOrEqual(6)
    expect(new Set(TOPIC_SLUGS).size).toBe(TOPIC_SLUGS.length)
  })

  it('every post declares exactly one known topic', () => {
    for (const p of posts) {
      expect(TOPIC_SLUGS.includes(p.topic), `${p.slug}: topic "${p.topic}"`).toBe(true)
    }
  })

  it('every hub has a resolvable pillar inside its own cluster and enough posts to be worth a hub', () => {
    for (const t of BLOG_TOPICS) {
      const cluster = getPostsByTopic(t.slug)
      expect(cluster.length, t.slug).toBeGreaterThanOrEqual(3)
      const pillar = cluster.find((p) => p.slug === t.pillar)
      expect(pillar, `${t.slug}: pillar "${t.pillar}" not in cluster`).toBeTruthy()
    }
  })

  it('every hub has a unique, non-empty editorial intro and metadata', () => {
    const intros = new Set<string>()
    for (const t of BLOG_TOPICS) {
      expect(t.intro.length, t.slug).toBeGreaterThan(100) // real editorial copy, not a stub
      expect(t.description.length, t.slug).toBeGreaterThan(50)
      expect(t.name.length, t.slug).toBeGreaterThan(0)
      intros.add(t.intro)
    }
    expect(intros.size).toBe(BLOG_TOPICS.length)
  })

  it('getTopic resolves known slugs and rejects unknown ones', () => {
    expect(getTopic('voice-ai')?.name).toBe('Voice AI')
    expect(getTopic('nonexistent')).toBeNull()
  })
})
