import type { CommerceProduct } from '@/lib/commerce/types'

/** The two chairs of the page's example store (hero conversation, closing window). */
export const CHAIRS: CommerceProduct[] = [
  {
    id: 'luna',
    title: 'Luna chair, oak legs',
    price: '€329',
    url: '#',
    imageUrl: '/component-previews/chair.webp',
    inStock: true,
  },
  {
    id: 'arlow',
    title: 'Arlow armchair, walnut',
    price: '€389',
    url: '#',
    imageUrl: '/component-previews/chair-walnut.webp',
    inStock: true,
  },
]
