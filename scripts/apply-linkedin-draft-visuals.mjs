/**
 * Point the current live LinkedIn drafts at the illustrated image set.
 *
 * Dry run:
 *   node scripts/apply-linkedin-draft-visuals.mjs
 * Apply after the assets are deployed:
 *   node scripts/apply-linkedin-draft-visuals.mjs --apply
 */
import { access } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const assignments = [
  ['0c374f60-2f73-491b-90e5-9a22648a5446', '05-support-metrics-illustrated.webp', 'An unstable tower of speech bubbles contrasts with solid symbols for resolution, fallback, handoff, and commercial outcomes.'],
  ['45138260-6e18-482a-9e5a-800532c6ae3f', '04-repetitive-questions-illustrated.webp', 'A solo store owner packs an order inside a calm workspace while repeated support questions swirl into one automated path.'],
  ['f670a481-b17a-4510-b42c-b9c8c1ba9f4a', '03-voice-shopping-illustrated.webp', 'A shopper with both hands occupied sends an orange voice trail through several choices toward one weather-ready running shoe.'],
  ['74c54440-2c79-418e-a255-4ff107a580e7', '10-context-memory-illustrated.webp', 'Two moments around the same coffee machine stay connected by one orange conversation ribbon as a cleaning requirement is added.'],
  ['57764012-de66-49e0-8112-774e99556205', '06-conversational-lead-illustrated.webp', 'A rigid wall of blank form fields breaks open as a helpful product answer reaches an email handoff only afterwards.'],
  ['4fd1af10-4cb3-4c90-a610-33eec5ff9c95', '08-five-tests-illustrated.webp', 'A conversational agent is surrounded by five test portals for uncertainty, language, order privacy, human handoff, and sources.'],
  ['968f7f5f-3e4a-4cb4-8bee-5decf401aff6', '09-right-sized-support-illustrated.webp', 'A tiny online shop chooses a compact support toolkit beside an enormous, mostly unused enterprise control machine.'],
  ['10000000-0000-4000-8000-000000000019', '19-model-vs-system-illustrated.webp', 'One conversational prism connects to a wider support system of store knowledge, commerce, privacy, measurement, language, and human help.'],
  ['9095a072-057f-463d-a6a5-7c9d3121fa57', '11-shopify-context-illustrated.webp', 'Store shelves, product variants, inventory, and order context flow into one continuous customer conversation.'],
  ['6bb4b086-3d5f-4ae5-a9ed-ec99033ff333', '07-woocommerce-stack-illustrated.webp', 'Tangled plugin cables around a small online shop become one clean conversation connected to products, policy, orders, and people.'],
  ['10000000-0000-4000-8000-000000000014', '14-generous-limits-illustrated.webp', 'A large transparent reservoir absorbs everyday conversations and a campaign wave with generous headroom beside a discarded meter.'],
  ['10000000-0000-4000-8000-000000000013', '13-lithuanian-language-illustrated.webp', 'A Baltic-inspired loom weaves varied speech ribbons and international product symbols into one coherent conversation fabric.'],
  ['10000000-0000-4000-8000-000000000016', '16-privacy-by-design-illustrated.webp', 'A cutaway privacy vault protects a conversation through identity, minimal contact, scoped store data, and authorised human-access gates.'],
  ['10000000-0000-4000-8000-000000000017', '17-small-store-capacity-illustrated.webp', 'A solo store owner packs orders while orange paths quietly handle routine product, parcel, and support questions around the workspace.'],
  ['10000000-0000-4000-8000-000000000015', '15-cart-question-illustrated.webp', 'A cart pauses at a checkout canyon among doubts about fit, compatibility, delivery, and returns as a lantern reveals a bridge.'],
  ['10000000-0000-4000-8000-000000000018', '18-campaign-readiness-illustrated.webp', 'A small online store faces an incoming campaign wave behind five stable readiness steps for knowledge, products, privacy, testing, and handoff.'],
].map(([id, filename, imageAlt]) => ({
  id,
  filename,
  imageUrl: `/linkedin/${filename}`,
  imageAlt,
}))

for (const { filename } of assignments) {
  await access(path.join(process.cwd(), 'public', 'linkedin', filename))
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const ids = assignments.map(({ id }) => id)
const { data: drafts, error: readError } = await supabase
  .from('linkedin_posts')
  .select('id, title, status, image_url')
  .in('id', ids)
if (readError) throw readError

const byId = new Map(drafts.map((draft) => [draft.id, draft]))
const eligible = assignments.filter(({ id }) => byId.get(id)?.status === 'draft')
const skipped = assignments.filter(({ id }) => byId.get(id)?.status !== 'draft')

console.table(eligible.map(({ id, imageUrl }) => ({
  title: byId.get(id)?.title,
  current: byId.get(id)?.image_url,
  next: imageUrl,
})))

if (skipped.length) {
  console.log(`Skipped ${skipped.length} post(s) that are missing or no longer drafts.`)
}

if (!process.argv.includes('--apply')) {
  console.log(`Dry run only: ${eligible.length} draft image(s) are ready. Pass --apply after deployment.`)
  process.exit(0)
}

const now = new Date().toISOString()
for (const { id, imageUrl, imageAlt } of eligible) {
  const { error } = await supabase
    .from('linkedin_posts')
    .update({ image_url: imageUrl, image_alt: imageAlt, updated_at: now })
    .eq('id', id)
    .eq('status', 'draft')
  if (error) throw error
}

console.log(`Updated ${eligible.length} live LinkedIn draft image(s).`)
