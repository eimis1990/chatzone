import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProductSearchSynonym {
  phrase: string
  replacement: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Replace merchant-approved shopper wording with the canonical catalogue term.
 * Longer phrases run first so "washable sofa cover" wins over "sofa cover".
 */
export function rewriteProductQueryWithSynonyms(
  query: string,
  synonyms: ProductSearchSynonym[],
): string {
  return [...synonyms]
    .sort((a, b) => b.phrase.length - a.phrase.length)
    .reduce((current, synonym) => {
      const phrase = synonym.phrase.trim()
      const replacement = synonym.replacement.trim()
      if (!phrase || !replacement) return current
      const pattern = new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}(?=$|[^\\p{L}\\p{N}])`,
        'giu',
      )
      return current.replace(pattern, (_match, prefix: string) => `${prefix}${replacement}`)
    }, query)
}

export async function applyProductSearchSynonyms(
  db: SupabaseClient,
  botId: string,
  query: string,
): Promise<string> {
  try {
    const { data, error } = await db
      .from('product_search_synonyms')
      .select('phrase, replacement')
      .eq('bot_id', botId)
      .order('phrase_normalized', { ascending: true })
      .limit(100)

    if (error) {
      // A missing migration or temporary Data API failure must not break
      // product search. The original query remains a safe fallback.
      console.error('[agent] product synonym lookup failed; using original query:', error.message)
      return query
    }

    return rewriteProductQueryWithSynonyms(query, (data ?? []) as ProductSearchSynonym[])
  } catch (error) {
    console.error('[agent] product synonym lookup threw; using original query:', error)
    return query
  }
}
