'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import type { LinkedInPost, LinkedInPostStatus } from '@/lib/types'

const PATH = '/owner/linkedin'

export interface LinkedInPostInput {
  title: string
  body: string
  link: string
  image_url: string
  image_alt: string
  status: LinkedInPostStatus
  sort_order?: number
}

/** Shared shape for insert/update — normalises empty link and stamps posted_at. */
function rowFromInput(input: LinkedInPostInput) {
  return {
    title: input.title.trim(),
    body: input.body,
    link: input.link.trim() || null,
    image_url: input.image_url.trim() || null,
    image_alt: input.image_alt.trim() || null,
    status: input.status,
    ...(input.sort_order === undefined ? {} : { sort_order: input.sort_order }),
    posted_at: input.status === 'posted' ? new Date().toISOString() : null,
  }
}

export async function createLinkedInPost(input: LinkedInPostInput): Promise<LinkedInPost> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { data: lastPost } = await svc
    .from('linkedin_posts')
    .select('sort_order')
    .eq('status', input.status)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>()
  const { data, error } = await svc
    .from('linkedin_posts')
    .insert({ ...rowFromInput(input), sort_order: (lastPost?.sort_order ?? -1) + 1 })
    .select('*')
    .single<LinkedInPost>()
  if (error || !data) throw new Error(`Failed to create post: ${error?.message ?? 'unknown error'}`)
  revalidatePath(PATH)
  return data
}

export async function updateLinkedInPost(id: string, input: LinkedInPostInput): Promise<LinkedInPost> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('linkedin_posts')
    .update({ ...rowFromInput(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single<LinkedInPost>()
  if (error || !data) throw new Error(`Failed to update post: ${error?.message ?? 'unknown error'}`)
  revalidatePath(PATH)
  return data
}

export async function setLinkedInPostStatus(
  id: string,
  status: LinkedInPostStatus,
): Promise<LinkedInPost> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('linkedin_posts')
    .update({
      status,
      posted_at: status === 'posted' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single<LinkedInPost>()
  if (error || !data) throw new Error(`Failed to update status: ${error?.message ?? 'unknown error'}`)
  revalidatePath(PATH)
  return data
}

export interface LinkedInPostPositionUpdate {
  id: string
  status: LinkedInPostStatus
  sort_order: number
  posted_at: string | null
}

/** Persist a complete drag result after the board has updated optimistically. */
export async function updateLinkedInPostPositions(
  updates: LinkedInPostPositionUpdate[],
): Promise<LinkedInPost[]> {
  await requireRole('owner')
  const svc = createServiceClient()
  const now = new Date().toISOString()

  const rows = await Promise.all(
    updates.map(async (update) => {
      const { data, error } = await svc
        .from('linkedin_posts')
        .update({
          status: update.status,
          sort_order: Math.max(0, Math.trunc(update.sort_order)),
          posted_at: update.status === 'posted' ? (update.posted_at ?? now) : null,
          updated_at: now,
        })
        .eq('id', update.id)
        .select('*')
        .single<LinkedInPost>()
      if (error || !data) {
        throw new Error(`Failed to save board order: ${error?.message ?? 'unknown error'}`)
      }
      return data
    }),
  )

  revalidatePath(PATH)
  return rows
}

export async function deleteLinkedInPost(id: string): Promise<void> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { error } = await svc.from('linkedin_posts').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete post: ${error.message}`)
  revalidatePath(PATH)
}
