import type { CommerceProvider } from '@/lib/commerce/types'
import { CORE_FOLDER } from './availability'

/** Display labels per provider — `satisfies` makes adding a CommerceProvider
 *  member a compile error until it gets a label, so its folder appears
 *  automatically and named. */
const PROVIDER_LABELS = {
  woocommerce: 'WooCommerce',
  shopify: 'Shopify',
  magento: 'Magento',
  verskis: 'Verskis',
  feed: 'Product feed',
} satisfies Record<CommerceProvider, string>

export interface ComponentFolder {
  id: string
  label: string
  description: string
}

export const COMPONENT_FOLDERS: ComponentFolder[] = [
  {
    id: CORE_FOLDER,
    label: 'Core',
    description: 'Available to every bot, regardless of store platform.',
  },
  ...(Object.entries(PROVIDER_LABELS) as [CommerceProvider, string][]).map(([id, label]) => ({
    id: id as string,
    label,
    description: `Available to bots connected to ${label}.`,
  })),
]

export function folderById(id: string): ComponentFolder | undefined {
  return COMPONENT_FOLDERS.find((f) => f.id === id)
}
