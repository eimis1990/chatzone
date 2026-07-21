import { describe, it, expect } from 'vitest'
import { buildManifest, diffManifests } from '../../scripts/indexnow-manifest.mjs'
import sitemap from '@/app/sitemap'

describe('indexnow manifest', () => {
  const manifest = buildManifest() as Record<string, string>

  it('covers exactly the sitemap URL set', () => {
    const sitemapUrls = new Set(sitemap().map((e) => e.url.replace(/\/$/, '')))
    const manifestUrls = new Set(Object.keys(manifest).map((u) => u.replace(/\/$/, '')))
    expect([...manifestUrls].filter((u) => !sitemapUrls.has(u))).toEqual([])
    expect([...sitemapUrls].filter((u) => !manifestUrls.has(u))).toEqual([])
  })

  it('is deterministic', () => {
    expect(buildManifest()).toEqual(manifest)
  })

  it('diff: unchanged build submits zero URLs', () => {
    const { changed, deleted } = diffManifests(manifest, manifest)
    expect(changed).toEqual([])
    expect(deleted).toEqual([])
  })

  it('diff: one edited article yields that URL; removals are reported', () => {
    const url = Object.keys(manifest).find((u) => u.includes('/blog/'))!
    const edited = { ...manifest, [url]: 'different-hash' }
    expect(diffManifests(manifest, edited)).toEqual({ changed: [url], deleted: [] })

    const removed: Record<string, string> = { ...manifest }
    delete removed[url]
    expect(diffManifests(manifest, removed)).toEqual({ changed: [], deleted: [url] })

    const added = { ...manifest, 'https://www.loqara.com/blog/brand-new': 'h' }
    expect(diffManifests(manifest, added).changed).toEqual(['https://www.loqara.com/blog/brand-new'])
  })
})
