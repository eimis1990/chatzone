import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { normalizePublicationCover } from '@/lib/content-studio/publish/cover'

describe('Content Studio publication cover', () => {
  it('normalizes an approved image to the public 1200×800 WebP contract', async () => {
    const source = await sharp({
      create: { width: 300, height: 500, channels: 3, background: '#e97634' },
    }).png().toBuffer()

    const output = await normalizePublicationCover(new Uint8Array(source))
    const metadata = await sharp(output).metadata()
    expect(metadata).toMatchObject({ width: 1200, height: 800, format: 'webp' })
  })

  it('rejects empty and undecodable cover bytes', async () => {
    await expect(normalizePublicationCover(new Uint8Array())).rejects.toThrow(/empty or too large/)
    await expect(normalizePublicationCover(new Uint8Array([1, 2, 3]))).rejects.toThrow()
  })
})
