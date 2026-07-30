import { openai } from '@ai-sdk/openai'
import { generateText, type ModelMessage } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import { buildMessages, contentFor, defaultLanguage, type ChatMessage } from '@/lib/ai/prompt'
import { DEFAULT_CHAT_MODEL, DEFAULT_TEMPERATURE } from '@/lib/ai/chat-models'
import { rewriteQuery } from '@/lib/ai/query-rewrite'
import type { Bot, Citation } from '@/lib/types'

/**
 * Channel-independent message processor for EXTERNAL channels (Messenger
 * first). Reuses the same grounding pipeline as the widget chat route
 * (retrieval → rewrite-retry → prompt build → model), minus widget-only
 * concerns: no streaming, no commerce tools/product cards (deferred for
 * Messenger v1 per docs/CHANNELS_IMPLEMENTATION.md), no handoff escalation
 * (Inbox outbound delivery doesn't exist yet — promising a human who cannot
 * reply on the channel would be worse than a fallback answer).
 *
 * Persists the assistant message and returns its text, or the fallback
 * message when retrieval is too weak to answer safely.
 */
export async function processChannelMessage(
  svc: SupabaseClient,
  bot: Bot,
  opts: { conversationId: string; message: string },
): Promise<string> {
  const { conversationId, message } = opts
  const lang = defaultLanguage(bot.config)

  const { data: historyRows } = await svc
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(40)
  const history: ChatMessage[] = (historyRows ?? [])
    .slice(0, -1) // drop the just-inserted user turn; buildMessages adds it as the tail
    .map((m) => ({ role: m.role as ChatMessage['role'], content: m.content as string }))

  // Same weak-retrieval retry as the widget: condense elliptical follow-ups
  // into a standalone query before giving up.
  let retrieval = await retrieveContext(bot.id, message, {}, serviceRetrievalDeps(svc))
  if (retrieval.isWeak) {
    const rewritten = await rewriteQuery(message, history)
    if (rewritten) {
      const retry = await retrieveContext(bot.id, rewritten, {}, serviceRetrievalDeps(svc))
      if (!retry.isWeak) retrieval = retry
    }
  }

  let text: string
  let citations: Citation[] = []
  if (retrieval.isWeak) {
    text = contentFor(bot.config, lang).fallbackMessage
    await svc.from('conversations').update({ had_fallback: true }).eq('id', conversationId)
  } else {
    const messages = buildMessages(
      bot.config,
      retrieval.chunks,
      history,
      message,
      lang,
    ) as ModelMessage[]
    citations = retrieval.matched.map((m) => ({
      source_id: m.source_id,
      snippet: m.content.slice(0, 160),
    }))
    const result = await generateText({
      model: openai(bot.config.model || DEFAULT_CHAT_MODEL),
      messages,
      temperature: bot.config.temperature ?? DEFAULT_TEMPERATURE,
    })
    text = result.text || contentFor(bot.config, lang).fallbackMessage
  }

  await svc
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'assistant', content: text, citations })
  await svc
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
  return text
}
