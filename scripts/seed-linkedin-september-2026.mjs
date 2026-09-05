/**
 * Idempotently create the September 2026 LinkedIn draft slate.
 *
 * Dry run: node scripts/seed-linkedin-september-2026.mjs
 * Apply:   node scripts/seed-linkedin-september-2026.mjs --apply
 *
 * The apply path preserves the six undeveloped ideas and all posted content. Four
 * reviewed ideas reuse their existing IDs and are promoted to complete drafts.
 */
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { SEPTEMBER_2026_LINKEDIN_POSTS } from './linkedin-september-2026-content.mjs'

config({ path: '.env.local', quiet: true })

const apply = process.argv.includes('--apply')
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`)
}

for (const post of SEPTEMBER_2026_LINKEDIN_POSTS) {
  if (post.body.length > 3_000) throw new Error(`${post.id} exceeds LinkedIn board body limit`)
  await access(path.join(process.cwd(), 'public', post.image_url))
}

const rows = SEPTEMBER_2026_LINKEDIN_POSTS.map((source, sort_order) => {
  const post = { ...source }
  delete post.pillar
  return {
    ...post,
    status: 'draft',
    sort_order,
    posted_at: null,
    updated_at: new Date().toISOString(),
  }
})

console.log(`${apply ? 'Applying' : 'Would apply'} ${rows.length} LinkedIn drafts:`)
for (const [index, row] of rows.entries()) console.log(`${index + 1}. ${row.title}`)

if (!apply) {
  console.log('\nDry run only. Pass --apply after the image URLs are publicly available.')
  process.exit(0)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

for (const row of rows) {
  const filename = path.basename(row.image_url)
  const objectPath = `linkedin/september-2026/${filename}`
  const source = await readFile(path.join(process.cwd(), 'public', row.image_url))
  const { error: uploadError } = await supabase.storage.from('public-assets').upload(objectPath, source, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: true,
  })
  if (uploadError) throw uploadError

  const { data: publicAsset } = supabase.storage.from('public-assets').getPublicUrl(objectPath)
  row.image_url = publicAsset.publicUrl
}

const { error } = await supabase.from('linkedin_posts').upsert(rows, { onConflict: 'id' })
if (error) throw error

const { data: saved, error: readError } = await supabase
  .from('linkedin_posts')
  .select('id,title,status,sort_order,image_url')
  .in('id', rows.map((row) => row.id))
  .order('sort_order')
if (readError) throw readError
if (saved.length !== rows.length || saved.some((row) => row.status !== 'draft')) {
  throw new Error(`Verification failed: expected ${rows.length} saved drafts, received ${saved.length}`)
}

console.log(`\nVerified ${saved.length} live drafts.`)
