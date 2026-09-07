import { describe, expect, it } from 'vitest'
import { leadToolEnabled, makeLeadTools, type LeadFormRequest } from '@/lib/ai/lead-tool'
import type { BotConfig } from '@/lib/types'

const config = {
  leadCapture: {
    enabled: true,
    trigger: 'on_fallback',
    offerOnIntent: true,
    intentHint: 'hall rental or event bookings',
    fields: [
      { key: 'name', label: 'Vardas', required: true, type: 'text' },
      { key: 'date', label: 'Data', required: true, type: 'date' },
      { key: 'guests', label: 'Dalyvių kiekis', required: false, type: 'number' },
    ],
  },
} as unknown as BotConfig

type Exec = (input: unknown, opts: unknown) => Promise<unknown>

describe('open_lead_form tool', () => {
  it('is offered only when enabled + offerOnIntent + fields + lead-form component allowed', () => {
    expect(leadToolEnabled(config)).toBe(true)
    expect(leadToolEnabled(config, new Set(['lead-form']))).toBe(true)
    expect(leadToolEnabled(config, new Set(['product-cards']))).toBe(false)
    expect(leadToolEnabled({ ...config, leadCapture: { ...config.leadCapture, offerOnIntent: false } })).toBe(false)
    expect(leadToolEnabled({ ...config, leadCapture: { ...config.leadCapture, fields: [] } })).toBe(false)
  })

  it('describes the configured fields and the business intent hint to the model', () => {
    const tools = makeLeadTools(config, [])
    expect(tools.open_lead_form.description).toContain('hall rental or event bookings')
    expect(tools.open_lead_form.description).toContain('date (Data, required)')
  })

  it('pushes prefill to the sink, keeping only configured keys', async () => {
    const sink: LeadFormRequest[] = []
    const tools = makeLeadTools(config, sink)
    const result = await (tools.open_lead_form.execute as Exec)(
      { prefill: { date: '2026-10-03', guests: '120', budget: '5000', name: '  ' } },
      {} as never,
    )
    expect(sink).toEqual([{ prefill: { date: '2026-10-03', guests: '120' } }])
    expect(result).toMatchObject({ opened: true })
  })
})
