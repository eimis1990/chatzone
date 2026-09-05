'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import type { LinkedInPostStatus, SocialPlatform, SocialPost } from '@/lib/types'

const PATH = '/owner/social'
const BODY_LIMIT: Record<SocialPlatform, number> = {
  facebook: 5_000,
  instagram: 2_200,
}

export interface SocialPostInput {
  title: string
  body: string
  link: string
  image_url: string
  image_alt: string
  status: LinkedInPostStatus
  sort_order?: number
}

function assertInput(platform: SocialPlatform, input: SocialPostInput) {
  if (!input.title.trim()) throw new Error('Give the post a title')
  if (input.status !== 'idea' && !input.body.trim()) {
    throw new Error('Drafts and posted entries need post copy')
  }
  if (input.body.length > BODY_LIMIT[platform]) {
    throw new Error(`${platform === 'facebook' ? 'Facebook' : 'Instagram'} copy must stay under ${BODY_LIMIT[platform].toLocaleString()} characters`)
  }
}

function rowFromInput(platform: SocialPlatform, input: SocialPostInput) {
  assertInput(platform, input)
  return {
    platform,
    title: input.title.trim(),
    body: input.body,
    link: input.link.trim() || null,
    image_url: input.image_url.trim() || null,
    image_alt: input.image_alt.trim() || null,
    status: input.status,
    ...(input.sort_order === undefined ? {} : { sort_order: Math.max(0, Math.trunc(input.sort_order)) }),
    posted_at: input.status === 'posted' ? new Date().toISOString() : null,
  }
}

export async function createSocialPost(
  platform: SocialPlatform,
  input: SocialPostInput,
): Promise<SocialPost> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { data: lastPost } = await svc
    .from('social_posts')
    .select('sort_order')
    .eq('platform', platform)
    .eq('status', input.status)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>()
  const { data, error } = await svc
    .from('social_posts')
    .insert({ ...rowFromInput(platform, input), sort_order: (lastPost?.sort_order ?? -1) + 1 })
    .select('*')
    .single<SocialPost>()
  if (error || !data) throw new Error(`Failed to create post: ${error?.message ?? 'unknown error'}`)
  revalidatePath(PATH)
  return data
}

export async function updateSocialPost(
  platform: SocialPlatform,
  id: string,
  input: SocialPostInput,
): Promise<SocialPost> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('social_posts')
    .update({ ...rowFromInput(platform, input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('platform', platform)
    .select('*')
    .single<SocialPost>()
  if (error || !data) throw new Error(`Failed to update post: ${error?.message ?? 'unknown error'}`)
  revalidatePath(PATH)
  return data
}

export interface SocialPostPositionUpdate {
  id: string
  status: LinkedInPostStatus
  sort_order: number
  posted_at: string | null
}

export async function updateSocialPostPositions(
  platform: SocialPlatform,
  updates: SocialPostPositionUpdate[],
): Promise<SocialPost[]> {
  await requireRole('owner')
  const svc = createServiceClient()
  const now = new Date().toISOString()

  const rows = await Promise.all(
    updates.map(async (update) => {
      const { data, error } = await svc
        .from('social_posts')
        .update({
          status: update.status,
          sort_order: Math.max(0, Math.trunc(update.sort_order)),
          posted_at: update.status === 'posted' ? (update.posted_at ?? now) : null,
          updated_at: now,
        })
        .eq('id', update.id)
        .eq('platform', platform)
        .select('*')
        .single<SocialPost>()
      if (error || !data) {
        throw new Error(`Failed to save board order: ${error?.message ?? 'unknown error'}`)
      }
      return data
    }),
  )

  revalidatePath(PATH)
  return rows
}

export async function deleteSocialPost(platform: SocialPlatform, id: string): Promise<void> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { error } = await svc.from('social_posts').delete().eq('id', id).eq('platform', platform)
  if (error) throw new Error(`Failed to delete post: ${error.message}`)
  revalidatePath(PATH)
}
