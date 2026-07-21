import { readdirSync } from 'fs'
import { join } from 'path'
import { ShowcaseFan } from './ShowcaseFan'

/**
 * Reads every image in public/chatviews at build/render time, so adding a file
 * to that folder makes it show up here automatically — no code change needed.
 */
function chatViewImages(): string[] {
  try {
    return readdirSync(join(process.cwd(), 'public', 'chatviews'))
      .filter((f) => /\.(webp|avif)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
      .map((f) => `/chatviews/${f}`)
  } catch {
    return []
  }
}

export function Showcase() {
  const images = chatViewImages()
  if (images.length === 0) return null
  return <ShowcaseFan images={images} />
}
