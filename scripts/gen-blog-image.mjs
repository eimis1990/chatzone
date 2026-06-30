#!/usr/bin/env node
/**
 * Generate an illustrative blog image with OpenAI, convert to a light .webp.
 *
 * Higgsfield is our primary image tool; this is the documented fallback when its
 * credits run out (uses OPENAI_API_KEY). Text-in-image from diffusion models is
 * unreliable, so prompts MUST stay illustrative/abstract — data and labels live
 * in the CSS blocks (tables, stat cards), never baked into a raster.
 *
 * Usage: node scripts/gen-blog-image.mjs <output-slug> "<prompt>"
 *   → writes public/blog/<output-slug>.webp
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const [slug, prompt] = process.argv.slice(2)
if (!slug || !prompt) {
  console.error('Usage: node scripts/gen-blog-image.mjs <slug> "<prompt>"')
  process.exit(1)
}

function env(key) {
  const raw = readFileSync('.env.local', 'utf8')
  const m = raw.match(new RegExp('^' + key + '=(.*)$', 'm'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined
}

const API_KEY = process.env.OPENAI_API_KEY || env('OPENAI_API_KEY')
if (!API_KEY) {
  console.error('OPENAI_API_KEY not found')
  process.exit(1)
}

async function generate() {
  // Preferred: gpt-image-1 (best quality, always returns b64).
  let res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', n: 1 }),
  })
  if (res.ok) return (await res.json()).data[0].b64_json
  const err1 = await res.text()
  console.warn('gpt-image-1 failed, falling back to dall-e-3:', err1.slice(0, 200))

  res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: '1792x1024',
      response_format: 'b64_json',
      n: 1,
    }),
  })
  if (!res.ok) {
    console.error('dall-e-3 also failed:', await res.text())
    process.exit(1)
  }
  return (await res.json()).data[0].b64_json
}

const b64 = await generate()
const tmpPng = join('/tmp', `${slug}.png`)
writeFileSync(tmpPng, Buffer.from(b64, 'base64'))

const out = join('public', 'blog', `${slug}.webp`)
// Resize to 1200px wide and encode webp q80 — matches the existing hero images'
// light footprint and keeps LCP/CLS healthy.
execFileSync('cwebp', ['-q', '80', '-resize', '1200', '0', tmpPng, '-o', out], {
  stdio: 'inherit',
})
unlinkSync(tmpPng)
const { size } = (await import('node:fs')).statSync(out)
console.log(`✓ ${out} (${Math.round(size / 1024)} KB)`)
