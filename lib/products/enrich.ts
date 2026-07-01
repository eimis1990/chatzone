import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { RawProduct, Audience } from './catalog'

const BATCH = 15
const schema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      tags: z.array(z.string()),
      audience: z.enum(['women', 'men', 'kids', 'unisex']),
    }),
  ),
})

export interface Enrichment {
  tags: string[]
  audience: Audience
}

/**
 * AI enrichment per product:
 *  - `tags`: 3–6 short search tags describing WHO it suits and WHEN it's bought
 *    (recipients, occasions, use-cases) — in the product's OWN language.
 *  - `audience`: the primary intended recipient, so a "gift for men" search can
 *    exclude women's/children's items.
 * Batched to bound cost; resilient (a failed batch just leaves those products
 * with their derived tags/audience). Returns id → enrichment.
 */
export async function aiEnrich(products: RawProduct[]): Promise<Map<string, Enrichment>> {
  const map = new Map<string, Enrichment>()
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH)
    try {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema,
        prompt:
          'For each product below, return:\n' +
          '1) "tags": 3-6 short, lowercase search tags describing who it suits and when someone would ' +
          'buy it — recipients (e.g. "for women"/"moterims", "for men"/"vyrams", "for kids"/"vaikams"), ' +
          'occasions ("gift", "birthday gift", "christmas gift"), and key use-cases/qualities. Write the ' +
          'tags in the SAME language as the product.\n' +
          '2) "audience": the PRIMARY intended recipient — one of "women", "men", "kids", "unisex". ' +
          'Use "unisex" when it genuinely suits anyone or multiple genders; use "kids" ONLY for ' +
          "children's products. Judge by what the item is, not just wording.\n" +
          'Return exactly one entry per product id.\n\n' +
          batch
            .map((p) => `[${p.id}] ${p.title} — ${p.categories.join(', ')} — ${p.description.slice(0, 200)}`)
            .join('\n'),
      })
      for (const it of object.items) map.set(it.id, { tags: it.tags.slice(0, 8), audience: it.audience })
    } catch {
      // Batch failed → those products keep their derived tags/audience only.
    }
  }
  return map
}
