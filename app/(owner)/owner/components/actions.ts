'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { componentMeta } from '@/lib/widget-components/meta'
import { folderById } from '@/lib/widget-components/folders'

export interface VariantRef {
  componentKey: string
  variantId: string
}

function assertValid(folderId: string, refs: VariantRef[]) {
  if (!folderById(folderId)) throw new Error('Unknown folder.')
  for (const { componentKey, variantId } of refs) {
    const meta = componentMeta(componentKey)
    if (!meta) throw new Error(`Unknown component: ${componentKey}`)
    if (!meta.variants.some((v) => v.id === variantId)) {
      throw new Error(`Unknown variant: ${componentKey}/${variantId}`)
    }
  }
}

function revalidate(folderId: string) {
  revalidatePath('/owner/components')
  revalidatePath(`/owner/components/${folderId}`)
}

export async function addProviderComponents(folderId: string, refs: VariantRef[]): Promise<void> {
  await requireRole('owner')
  assertValid(folderId, refs)
  if (refs.length === 0) return
  const supabase = await createServerClient()
  const { error } = await supabase.from('provider_components').upsert(
    refs.map(({ componentKey, variantId }) => ({
      provider: folderId,
      component_key: componentKey,
      variant_id: variantId,
    })),
    { onConflict: 'provider,component_key,variant_id', ignoreDuplicates: true },
  )
  if (error) throw new Error(error.message)
  revalidate(folderId)
}

export async function removeProviderComponent(
  folderId: string,
  componentKey: string,
  variantId: string,
): Promise<void> {
  await requireRole('owner')
  assertValid(folderId, [{ componentKey, variantId }])
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('provider_components')
    .delete()
    .eq('provider', folderId)
    .eq('component_key', componentKey)
    .eq('variant_id', variantId)
  if (error) throw new Error(error.message)
  revalidate(folderId)
}
