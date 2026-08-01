/**
 * Generate the current LinkedIn draft illustration set through Higgsfield.
 *
 * Usage:
 *   node scripts/generate-linkedin-higgsfield-visuals.mjs
 *   node scripts/generate-linkedin-higgsfield-visuals.mjs --force
 *   node scripts/generate-linkedin-higgsfield-visuals.mjs --only 05-support-metrics-illustrated.webp
 */
import { spawn } from 'node:child_process'
import { mkdir, access, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { CURRENT_DRAFT_IMAGE_PROMPTS } from './linkedin-image-prompts.mjs'

const OUT = path.join(process.cwd(), 'public', 'linkedin')
const force = process.argv.includes('--force')
const onlyIndex = process.argv.indexOf('--only')
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null

function runHiggsfield(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'higgsfield',
      [
        'generate',
        'create',
        'gpt_image_2',
        '--prompt',
        prompt,
        '--aspect_ratio',
        '16:9',
        '--resolution',
        '2k',
        '--quality',
        'high',
        '--wait',
        '--wait-timeout',
        '20m',
        '--json',
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    )

    let stdout = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`Higgsfield exited with code ${code}`))
      else resolve(stdout)
    })
  })
}

function findUrls(value, urls = []) {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) urls.push(value)
  else if (Array.isArray(value)) value.forEach((item) => findUrls(item, urls))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => findUrls(item, urls))
  return urls
}

function primaryImageUrl(stdout) {
  const parsed = JSON.parse(stdout)
  const urls = findUrls(parsed)
  const imageUrl = urls.find((url) => /\.(png|jpe?g|webp)(\?|$)/i.test(url)) ?? urls[0]
  if (!imageUrl) throw new Error('Higgsfield returned no media URL')
  return imageUrl
}

await mkdir(OUT, { recursive: true })

const selected = only
  ? CURRENT_DRAFT_IMAGE_PROMPTS.filter(({ filename }) => filename === only)
  : CURRENT_DRAFT_IMAGE_PROMPTS

if (only && selected.length === 0) throw new Error(`Unknown --only filename: ${only}`)

for (const [index, { filename, prompt }] of selected.entries()) {
  const output = path.join(OUT, filename)
  if (!force) {
    try {
      await access(output)
      console.log(`[${index + 1}/${selected.length}] kept ${filename}`)
      continue
    } catch {
      // Generate missing assets.
    }
  }

  console.log(`[${index + 1}/${selected.length}] generating ${filename}`)
  const stdout = await runHiggsfield(prompt)
  const url = primaryImageUrl(stdout)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download ${filename}: HTTP ${response.status}`)

  const source = Buffer.from(await response.arrayBuffer())
  const webp = await sharp(source)
    .resize(1200, 628, { fit: 'cover', position: 'centre' })
    .webp({ quality: 86, effort: 6 })
    .toBuffer()

  await writeFile(output, webp)
  console.log(`[${index + 1}/${selected.length}] saved ${filename}`)
}
