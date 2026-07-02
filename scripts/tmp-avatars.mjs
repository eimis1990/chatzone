#!/usr/bin/env node
/** TEMPORARY — generate 10 mascot avatars for the widget showcase shots. */
import { writeFileSync, mkdirSync } from 'node:fs'

const KEY = process.env.OPENAI_API_KEY
if (!KEY) throw new Error('OPENAI_API_KEY missing')
mkdirSync('public/demo-avatars', { recursive: true })

const STYLE =
  'Adorable 3D-rendered mascot character, Pixar-style, big friendly eyes, warm smile, ' +
  'soft studio lighting, centered head-and-shoulders portrait, high quality render, no text, no watermark, '

const AVATARS = {
  nova: 'a sleek friendly little robot with a glowing violet visor, dark metallic body with purple neon accents, solid very dark purple background',
  onyx: 'an elegant golden lion cub wearing a tiny bow tie, luxurious gold and black tones, solid near-black background',
  miko: 'a cute baby owl wearing an astronaut helmet with cyan glow, midnight blue tones, solid dark navy background',
  rouge: 'a charming ruby-red gemstone character with sparkling facets and cute face, deep burgundy velvet tones, solid dark burgundy background',
  fern: 'a happy little plant sprout character in a tiny terracotta pot, fresh green leaves, solid soft sage-green background',
  skye: 'a cheerful small bluebird with round body and tiny wings, sky blue tones, solid very light blue background',
  peony: 'a smiling pink peony flower character with soft petals, blush pink tones, solid pale pink background',
  sol: 'a joyful smiling sun character with soft rounded rays, warm golden amber tones, solid cream background',
  glacier: 'a cute baby penguin with icy blue scarf, frosty light blue tones, solid pale ice-blue background',
  terra: 'a warm friendly ceramic teapot character with terracotta glaze and cute face, warm clay tones, solid soft cream background',
}

async function gen(id, desc) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt: STYLE + desc, size: '1024x1024', n: 1 }),
  })
  if (!res.ok) throw new Error(`${id}: ${(await res.text()).slice(0, 200)}`)
  const b64 = (await res.json()).data[0].b64_json
  writeFileSync(`public/demo-avatars/${id}.png`, Buffer.from(b64, 'base64'))
  console.log('✓', id)
}

const entries = Object.entries(AVATARS)
for (let i = 0; i < entries.length; i += 3) {
  await Promise.all(entries.slice(i, i + 3).map(([id, d]) => gen(id, d)))
}
console.log('done')
