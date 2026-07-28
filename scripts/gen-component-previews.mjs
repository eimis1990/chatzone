#!/usr/bin/env node
/**
 * One-off: product photos for the component-library preview sample data
 * (lib/widget-components/registry.tsx). Clean e-commerce shots on white so the
 * preview cards look like a real store instead of a blog illustration.
 *
 * Usage: node scripts/gen-component-previews.mjs
 *   → writes public/component-previews/<name>.webp
 */
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

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

const STYLE =
  'Professional e-commerce product photograph, centered on a seamless plain white studio background, soft even lighting, subtle floor shadow, photorealistic, no text, no watermark, no props.'

const IMAGES = [
  ['sofa', `Modern three-seat sofa with warm beige fabric upholstery and light oak wooden legs. ${STYLE}`],
  ['chair', `Contemporary lounge chair with curved terracotta-orange fabric shell and light oak legs. ${STYLE}`],
  ['table', `Round Nordic-style coffee table in light oak with a minimalist silhouette. ${STYLE}`],
]

async function generate(prompt) {
  // gpt-image-2 first; older accounts fall back to gpt-image-1.
  for (const model of ['gpt-image-2', 'gpt-image-1']) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, size: '1024x1024', n: 1 }),
    })
    if (res.ok) return (await res.json()).data[0].b64_json
    console.warn(`${model} failed:`, (await res.text()).slice(0, 160))
  }
  throw new Error('all image models failed')
}

mkdirSync('public/component-previews', { recursive: true })
for (const [name, prompt] of IMAGES) {
  console.log(`generating ${name}…`)
  const b64 = await generate(prompt)
  const tmpPng = join('public/component-previews', `${name}.tmp.png`)
  const out = join('public/component-previews', `${name}.webp`)
  writeFileSync(tmpPng, Buffer.from(b64, 'base64'))
  execFileSync('cwebp', ['-q', '82', '-resize', '480', '0', tmpPng, '-o', out], { stdio: 'ignore' })
  unlinkSync(tmpPng)
  console.log(`wrote ${out}`)
}
