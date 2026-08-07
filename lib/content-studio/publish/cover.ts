import 'server-only'
import sharp from 'sharp'

const MAX_SOURCE_BYTES = 12 * 1024 * 1024

export async function normalizePublicationCover(bytes: Uint8Array): Promise<Uint8Array> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SOURCE_BYTES) {
    throw new Error('The approved cover image is empty or too large')
  }
  const image = sharp(bytes, { failOn: 'error' })
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) throw new Error('The approved cover image has invalid dimensions')
  const normalized = await image
    .resize(1200, 800, { fit: 'cover', position: 'centre' })
    .webp({ quality: 84 })
    .toBuffer()
  return new Uint8Array(normalized)
}
