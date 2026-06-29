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
  status: LinkedInPostStatus
}

/** Shared shape for insert/update — normalises empty link and stamps posted_at. */
function rowFromInput(input: LinkedInPostInput) {
  return {
    title: input.title.trim(),
    body: input.body,
    link: input.link.trim() || null,
    status: input.status,
    posted_at: input.status === 'posted' ? new Date().toISOString() : null,
  }
}

export async function createLinkedInPost(input: LinkedInPostInput): Promise<LinkedInPost> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('linkedin_posts')
    .insert(rowFromInput(input))
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

export async function deleteLinkedInPost(id: string): Promise<void> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { error } = await svc.from('linkedin_posts').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete post: ${error.message}`)
  revalidatePath(PATH)
}
