/**
 * Build separate Facebook and Instagram queues from every LinkedIn topic.
 *
 * Dry run: node scripts/seed-social-posts.mjs
 * Apply:   node scripts/seed-social-posts.mjs --apply
 *
 * LinkedIn ideas remain ideas. Every developed or previously published topic
 * becomes a fresh draft on both platforms, with the original artwork retained.
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local', quiet: true })

const apply = process.argv.includes('--apply')
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const FACEBOOK_PRIORITY = [
  '30000000-0000-4000-8000-000000000022', // attention, not minutes
  '40000000-0000-4000-8000-000000000041', // small teams, big expectations
  '30000000-0000-4000-8000-000000000021', // repeating yourself
  '30000000-0000-4000-8000-000000000023', // unfair policies
  '30000000-0000-4000-8000-000000000026', // checkout uncertainty
  '20000000-0000-4000-8000-000000000010', // the amnesia bug
  '30000000-0000-4000-8000-000000000024', // eliminate the question
  '10000000-0000-4000-8000-000000000015', // abandoned carts
  '40000000-0000-4000-8000-000000000042', // one useful question
  '20000000-0000-4000-8000-000000000002', // real store definition of done
  '30000000-0000-4000-8000-000000000027', // predictable vs personal
  '40000000-0000-4000-8000-000000000033', // recommendations need reasons
  '40000000-0000-4000-8000-000000000034', // zero-result research
  '20000000-0000-4000-8000-000000000005', // seven support jobs
  '57764012-de66-49e0-8112-774e99556205', // contact forms
  'fa6dec03-f9f4-4b38-a454-a44d8f66e3d2', // I don't know
  '27f065e1-6e79-4649-9c8f-13426b3bb6d4', // earn the right to talk
  '40000000-0000-4000-8000-000000000035', // resolution over replies
  '30000000-0000-4000-8000-000000000025', // help centre infrastructure
  '30000000-0000-4000-8000-000000000029', // catalogue as conversation data
]

const INSTAGRAM_PRIORITY = [
  '40000000-0000-4000-8000-000000000033', // strong visual contrast: advice vs ad
  '30000000-0000-4000-8000-000000000026', // invisible checkout questions
  '40000000-0000-4000-8000-000000000036', // natural language, not prompting
  '40000000-0000-4000-8000-000000000034', // the missing product signal
  '30000000-0000-4000-8000-000000000022', // fragmented attention
  '40000000-0000-4000-8000-000000000042', // one question vs five answers
  '20000000-0000-4000-8000-000000000010', // memory across the store
  '30000000-0000-4000-8000-000000000023', // polished message, unfair rule
  '30000000-0000-4000-8000-000000000027', // automate predictable work
  '30000000-0000-4000-8000-000000000021', // tangled handoffs
  '40000000-0000-4000-8000-000000000035', // reply vs resolution
  '30000000-0000-4000-8000-000000000024', // make the question disappear
  '40000000-0000-4000-8000-000000000038', // demo the failure path
  '30000000-0000-4000-8000-000000000028', // trust before speed
  '40000000-0000-4000-8000-000000000041', // tiny team, huge expectations
  '30000000-0000-4000-8000-000000000030', // occupied hands and voice
  '40000000-0000-4000-8000-000000000039', // support questions rewrite pages
  '40000000-0000-4000-8000-000000000040', // honest not yet
  '20000000-0000-4000-8000-000000000002', // demo vs real store
  '40000000-0000-4000-8000-000000000050', // public work, private boundaries
]

function withoutHashtagFooter(body) {
  return body
    .split(/\n{2,}/)
    .filter((paragraph) => !/^\s*(?:#[\p{L}\p{N}_-]+\s*)+$/u.test(paragraph))
    .join('\n\n')
    .trim()
}

function hashtagsFrom(body) {
  return [...new Set(body.match(/#[\p{L}\p{N}_-]+/gu) ?? [])]
}

function discussionPrompt(post) {
  const text = `${post.title} ${post.body}`.toLowerCase()
  if (/checkout|cart|conversion/.test(text)) return 'What unanswered question has made you abandon a purchase?'
  if (/small store|small team|founder|attention|interrupt/.test(text)) return 'Which repetitive task breaks your team’s focus most often?'
  if (/policy|privacy|trust|safe|don’t know|do not know|handoff/.test(text)) return 'Where should an AI assistant stop and bring in a person?'
  if (/product page|catalogue|search|recommend|product suggestion/.test(text)) return 'What product detail do online stores most often leave unclear?'
  if (/voice|accessib|language|lithuanian|multilingual/.test(text)) return 'Where would a more natural interface make the biggest difference for you?'
  if (/metric|analytics|resolution|reply|response time/.test(text)) return 'Which number would tell you that customer support actually improved?'
  if (/build|feature|demo|preview|ship|one line|database|plugin/.test(text)) return 'What “small” product improvement turned out to matter more than expected?'
  return 'Does this match what you see in real customer conversations?'
}

function fitAtParagraph(body, limit) {
  if (body.length <= limit) return body
  const paragraphs = body.split(/\n{2,}/)
  const kept = []
  for (const paragraph of paragraphs) {
    const candidate = [...kept, paragraph].join('\n\n')
    if (candidate.length > limit - 1) break
    kept.push(paragraph)
  }
  return `${kept.join('\n\n').replace(/[.:;!?]?$/, '')}…`
}

function facebookCaption(post) {
  const prompt = discussionPrompt(post)
  const main = fitAtParagraph(withoutHashtagFooter(post.body), 4_900 - prompt.length)
  return `${main}\n\n${prompt}`
}

function instagramCaption(post) {
  const prompt = discussionPrompt(post)
  const tags = hashtagsFrom(post.body).slice(0, 3)
  const footer = `${prompt}${tags.length ? `\n\n${tags.join(' ')}` : ''}`
  const main = fitAtParagraph(withoutHashtagFooter(post.body), 2_200 - footer.length - 2)
  return `${main}\n\n${footer}`
}

function rankPosts(posts, priority) {
  const priorityIndex = new Map(priority.map((id, index) => [id, index]))
  const sourceIndex = new Map(posts.map((post, index) => [post.id, index]))
  return [...posts].sort((a, b) => {
    const aRank = priorityIndex.get(a.id) ?? priority.length + sourceIndex.get(a.id)
    const bRank = priorityIndex.get(b.id) ?? priority.length + sourceIndex.get(b.id)
    return aRank - bRank || a.created_at.localeCompare(b.created_at)
  })
}

const { data: linkedinPosts, error: readError } = await supabase
  .from('linkedin_posts')
  .select('*')
  .order('status')
  .order('sort_order')
  .order('created_at')
if (readError) throw readError

const ideas = linkedinPosts.filter((post) => post.status === 'idea')
const developed = linkedinPosts.filter((post) => post.status !== 'idea')
const platformRows = [
  ['facebook', FACEBOOK_PRIORITY, facebookCaption],
  ['instagram', INSTAGRAM_PRIORITY, instagramCaption],
].flatMap(([platform, priority, adapt]) => {
  const orderedDrafts = rankPosts(developed, priority)
  return [
    ...ideas.map((post, sort_order) => ({ post, status: 'idea', sort_order })),
    ...orderedDrafts.map((post, sort_order) => ({ post, status: 'draft', sort_order })),
  ].map(({ post, status, sort_order }) => ({
    source_linkedin_post_id: post.id,
    platform,
    title: post.title,
    body: status === 'idea' ? post.body : adapt(post),
    link: post.link,
    image_url: post.image_url,
    image_alt: post.image_alt,
    status,
    sort_order,
    posted_at: null,
    updated_at: new Date().toISOString(),
  }))
})

for (const row of platformRows) {
  const limit = row.platform === 'instagram' ? 2_200 : 5_000
  if (row.body.length > limit) throw new Error(`${row.platform}: ${row.title} exceeds ${limit} characters`)
}

for (const platform of ['facebook', 'instagram']) {
  const rows = platformRows.filter((row) => row.platform === platform)
  console.log(`\n${platform.toUpperCase()}: ${rows.filter((row) => row.status === 'draft').length} drafts, ${rows.filter((row) => row.status === 'idea').length} ideas`)
  for (const row of rows.filter((item) => item.status === 'draft').slice(0, 20)) {
    console.log(`${row.sort_order + 1}. ${row.title}`)
  }
}

if (!apply) {
  console.log('\nDry run only. Pass --apply after the social_posts migration is live.')
  process.exit(0)
}

const { error: writeError } = await supabase
  .from('social_posts')
  .upsert(platformRows, { onConflict: 'platform,source_linkedin_post_id' })
if (writeError) throw writeError

const { data: saved, error: verifyError } = await supabase
  .from('social_posts')
  .select('platform,status,source_linkedin_post_id,body')
if (verifyError) throw verifyError

for (const platform of ['facebook', 'instagram']) {
  const rows = saved.filter((row) => row.platform === platform)
  if (rows.length !== linkedinPosts.length) {
    throw new Error(`${platform} verification failed: expected ${linkedinPosts.length}, received ${rows.length}`)
  }
  if (rows.filter((row) => row.status === 'draft').length !== developed.length) {
    throw new Error(`${platform} verification failed: draft count does not match developed topics`)
  }
}

console.log(`\nVerified ${saved.length} social rows across both platforms.`)
