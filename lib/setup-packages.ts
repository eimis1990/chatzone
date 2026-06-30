/**
 * One-time "done-for-you" setup & integration packages. A single source of truth
 * for the landing section and the in-app subscription screen so they never drift.
 * Plain data (no `server-only`) — safe to import from client components.
 *
 * These are ONE-TIME fees (pay once, never again), separate from the monthly
 * subscription plans in plans-catalog.ts.
 */
export type SetupPackageId = 'essential' | 'ecommerce'

export interface SetupPackage {
  id: SetupPackageId
  name: string
  /** One-time price in EUR. */
  price: number
  blurb: string
  /** Rough delivery time, shown as a badge. */
  timeline: string
  features: string[]
}

export const SETUP_PACKAGES: SetupPackage[] = [
  {
    id: 'essential',
    name: 'Essential',
    price: 749,
    blurb: 'We train, configure, and install your AI agent — fully done for you.',
    timeline: 'Live in ~1 week',
    features: [
      'Training on your website content',
      'Training on your documents (PDFs, docs)',
      'Agent persona & answers configured',
      'Installed on your website',
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    price: 995,
    blurb: 'Everything in Essential, plus your store fully connected.',
    timeline: 'Live in ~2 weeks',
    features: [
      'Everything in Essential',
      'Product catalog connected',
      'Order tracking — “where is my order?”',
      'Stock & availability answers',
    ],
  },
]
