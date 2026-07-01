import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { RawProduct } from './catalog'

const BATCH = 15
const schema = z.object({
  items: z.array(z.object({ id: z.string(), tags: z.array(z.string()) })),
})

/**
 * AI enrichment: 3–6 short search tags per product describing WHO it suits and
 * WHEN it's bought (recipients, occasions, use-cases, gift-suitability) — in the
 * product's own language. Batched to bound cost; resilient (a failed batch just
 * leaves those products with their derived tags). Returns id → tags.
 */
export async function aiTags(products: RawProduct[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH)
    try {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema,
        prompt:
          'For each product below, output 3-6 short, lowercase search tags describing who it suits ' +
          'and when someone would buy it: recipients (e.g. "for women", "for men", "for kids"), ' +
          'occasions (e.g. "gift", "birthday gift", "christmas gift"), and key use-cases/qualities. ' +
          'Write the tags in the SAME language as the product. Return one entry per product id.\n\n' +
          batch
            .map((p) => `[${p.id}] ${p.title} — ${p.categories.join(', ')} — ${p.description.slice(0, 200)}`)
            .join('\n'),
      })
      for (const it of object.items) map.set(it.id, it.tags.slice(0, 8))
    } catch {
      // Batch failed → those products keep their derived tags only.
    }
  }
  return map
}
