// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
const { parts } = vi.hoisted(() => ({ parts: [] as unknown[] }))
vi.mock('ai', async (original) => ({ ...await original<typeof import('ai')>(), streamText: () => ({ fullStream: (async function* () { for (const p of parts) yield p })() }) }))
import { ndjsonChatResponse } from '@/lib/ai/commerce-tool'
import { openai } from '@ai-sdk/openai'
function run(onResponse = vi.fn().mockResolvedValue(undefined)) {
  const onSettled = vi.fn().mockResolvedValue(undefined)
  const response = ndjsonChatResponse(openai('test'), [], { headers: {}, temperature: 0, errorText: 'Please try again.', onResponse, onSettled })
  return { response, onResponse, onSettled }
}
describe('conversation quota at stream delivery', () => {
  it('commits once before a generated answer and always settles', async () => {
    parts.splice(0, parts.length, {type:'text-delta',text:'Hello'}, {type:'text-delta',text:' there'})
    const r=run(); expect(await r.response.text()).toContain('Hello')
    expect(r.onResponse).toHaveBeenCalledTimes(1); expect(r.onSettled).toHaveBeenCalledOnce()
  })
  it('releases a model failure without billing the error response', async () => {
    parts.splice(0, parts.length, {type:'error',error:new Error('provider offline')})
    const r=run(); expect(await r.response.text()).toContain('Please try again.')
    expect(r.onResponse).not.toHaveBeenCalled(); expect(r.onSettled).toHaveBeenCalledOnce()
  })
  it('fails closed if recording usage fails before text delivery', async () => {
    parts.splice(0, parts.length, {type:'text-delta',text:'Paid answer'})
    const r=run(vi.fn().mockRejectedValue(new Error('database offline')))
    expect(await r.response.text()).not.toContain('Paid answer'); expect(r.onSettled).toHaveBeenCalledOnce()
  })
  it('releases an empty generation', async () => {
    parts.splice(0)
    const r=run(); await r.response.text(); expect(r.onResponse).not.toHaveBeenCalled(); expect(r.onSettled).toHaveBeenCalledOnce()
  })
})
