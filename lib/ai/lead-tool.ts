import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import type { BotConfig } from '@/lib/types'

/** What the model asked the widget to open; emitted as `{t:'lead_form'}`. */
export interface LeadFormRequest {
  prefill: Record<string, string>
}

/** True when the bot should be offered `open_lead_form` this turn. */
export function leadToolEnabled(config: BotConfig, allowedComponents?: Set<string>): boolean {
  const lc = config.leadCapture
  return Boolean(
    lc?.enabled && lc.offerOnIntent && lc.fields?.length && (allowedComponents?.has('lead-form') ?? true),
  )
}

/**
 * One tool: the model opens the bot's configured request/booking form in the
 * widget instead of interviewing the visitor field by field. `prefill` is
 * filtered to configured field keys so the model can't invent fields.
 */
export function makeLeadTools(config: BotConfig, sink: LeadFormRequest[]): ToolSet {
  const fields = config.leadCapture.fields
  const keys = new Set(fields.map((f) => f.key))
  const fieldList = fields.map((f) => `${f.key} (${f.label}${f.required ? ', required' : ''})`).join(', ')
  return {
    open_lead_form: tool({
      description:
        'Open the request/booking form in the chat so the visitor can send their details to the team. ' +
        'Call it when the visitor wants to book, reserve, order a service, get a quote, or be contacted' +
        (config.leadCapture.intentHint?.trim() ? ` (${config.leadCapture.intentHint.trim()})` : '') +
        `. Fields: ${fieldList}. Pass any values the visitor already mentioned as prefill (dates as YYYY-MM-DD). ` +
        'Call at most once per conversation.',
      inputSchema: z.object({
        prefill: z
          .record(z.string(), z.string())
          .optional()
          .describe('Field key → value for details the visitor already gave.'),
      }),
      execute: async ({ prefill }) => {
        const clean: Record<string, string> = {}
        for (const [k, v] of Object.entries(prefill ?? {})) {
          if (keys.has(k) && typeof v === 'string' && v.trim()) clean[k] = v.trim().slice(0, 500)
        }
        sink.push({ prefill: clean })
        return {
          opened: true,
          instruction:
            'The form is now open in the chat. Briefly tell the visitor to complete and send it; do not ask for the form details in chat.',
        }
      },
    }),
  }
}
