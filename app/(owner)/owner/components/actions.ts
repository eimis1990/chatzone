'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { componentMeta } from '@/lib/widget-components/meta'
import { folderById } from '@/lib/widget-components/folders'

function assertValid(folderId: string, keys: string[]) {
  if (!folderById(folderId)) throw new Error('Unknown folder.')
  for (const key of keys) {
    if (!componentMeta(key)) throw new Error(`Unknown component: ${key}`)
  }
}

export async function addProviderComponents(folderId: string, keys: string[]): Promise<void> {
  await requireRole('owner')
  assertValid(folderId, keys)
  if (keys.length === 0) return
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('provider_components')
    .upsert(
      keys.map((component_key) => ({ provider: folderId, component_key })),
      { onConflict: 'provider,component_key', ignoreDuplicates: true },
    )
  if (error) throw new Error(error.message)
  revalidatePath('/owner/components')
  revalidatePath(`/owner/components/${folderId}`)
}

export async function removeProviderComponent(folderId: string, key: string): Promise<void> {
  await requireRole('owner')
  assertValid(folderId, [key])
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('provider_components')
    .delete()
    .eq('provider', folderId)
    .eq('component_key', key)
  if (error) throw new Error(error.message)
  revalidatePath('/owner/components')
  revalidatePath(`/owner/components/${folderId}`)
}
