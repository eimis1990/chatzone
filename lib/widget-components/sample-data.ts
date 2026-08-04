import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'

export const SAMPLE_FURNITURE_PRODUCTS: CommerceProduct[] = [
  {
    id: 'demo-1',
    title: 'Oslo 3-seat sofa, oak legs',
    price: '€749',
    url: '#',
    imageUrl: '/component-previews/sofa.webp',
    inStock: true,
  },
  {
    id: 'demo-2',
    title: 'Luna lounge chair',
    price: '€329',
    url: '#',
    imageUrl: '/component-previews/chair.webp',
    inStock: true,
  },
  {
    id: 'demo-3',
    title: 'Nordic coffee table',
    price: '€189',
    url: '#',
    imageUrl: '/component-previews/table.webp',
    inStock: false,
  },
  {
    id: 'demo-4',
    title: 'Oslo loveseat, oak legs',
    price: '€549',
    url: '#',
    imageUrl: '/component-previews/sofa.webp',
    inStock: true,
  },
]

export const SAMPLE_CHAIR_PRODUCTS: CommerceProduct[] = [
  {
    id: 'chair-luna',
    title: 'Luna lounge chair, cognac',
    price: '€329',
    url: '#',
    imageUrl: '/component-previews/chair.webp',
    inStock: true,
  },
  {
    id: 'chair-arlow',
    title: 'Arlow lounge chair, walnut',
    price: '€389',
    url: '#',
    imageUrl: '/component-previews/chair-walnut.webp',
    inStock: true,
  },
  {
    id: 'chair-milo',
    title: 'Milo accent chair, sage',
    price: '€279',
    url: '#',
    imageUrl: '/component-previews/chair-sage.webp',
    inStock: true,
  },
]

export const SAMPLE_SHIPPED_ORDER: OrderStatus = {
  found: true,
  orderNumber: '10482',
  status: 'shipped',
  total: '148.90',
  currency: 'EUR',
  items: [
    { name: 'Oslo cushion set', quantity: 2, total: '99.90' },
    { name: 'Care kit', quantity: 1, total: '49.00' },
  ],
}
