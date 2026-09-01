import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatWindow } from '@/components/widget/ChatWindow'
import type { ChatTransport } from '@/lib/widget-transport'
import type { PublicBotConfig } from '@/lib/widget-config'

const config = {
  displayName: 'Test bot',
  theme: { primaryColor: '#c04b0c', position: 'bottom-right', cornerRadius: 16, bubbleRadius: 16 },
  languages: ['en'],
  defaultLanguage: 'en',
  showLanguageSelector: false,
  content: { en: { greeting: 'Hi!', suggestedQuestions: [] } },
  proactiveGreeting: {
    enabled: false, delaySeconds: 3, frequency: 'once_per_session', sound: 'none',
    messages: [], backgroundColor: '#fff', textColor: '#111', cornerRadius: 14, fontFamily: 'inherit',
  },
  leadCapture: { enabled: false, trigger: 'after_messages', fields: [] },
  voice: { enabled: false, ttsEnabled: false, sttEnabled: false },
  roomVisualizer: false,
} as unknown as PublicBotConfig

function mockTransport(overrides: Partial<ChatTransport> = {}): ChatTransport {
  return {
    sendChat: vi.fn(),
    search: vi.fn(async () => ({})),
    searchKnowledge: vi.fn(async () => ({ answer: '' })),
    getProductDetailsByName: vi.fn(async () => ({ summary: '' })),
    getVoiceToken: vi.fn(),
    fetchMessages: vi.fn(async () => []),
    sendFeedback: vi.fn(async () => {}),
    requestHandoff: vi.fn(async () => null),
    poll: vi.fn(async () => ({ status: 'bot' as const, agentName: null })),
    submitLead: vi.fn(async () => {}),
    lookupOrder: vi.fn(async () => ({ found: false, summary: '' })),
    getDiscountInfo: vi.fn(async () => ({ available: false, summary: '' })),
    ...overrides,
  }
}

const CONV_ID = '7d9a1f9e-1111-2222-3333-444455556666'

beforeEach(() => {
  // This jsdom/Node pairing ships no localStorage — stub a Map-backed one.
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  })
  window.matchMedia ??= ((q: string) => ({
    matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChatWindow conversation resume', () => {
  it('restores a recent conversation transcript when persistKey is set', async () => {
    localStorage.setItem(
      'cbz_conv_pk1',
      JSON.stringify({ id: CONV_ID, ts: Date.now() - 60_000 }),
    )
    const fetchMessages = vi.fn(async () => [
      { id: 'm1', role: 'user', content: 'Kur mano užsakymas?' },
      { id: 'm2', role: 'assistant', content: 'Tuoj patikrinsiu!' },
    ])
    const transport = mockTransport({ fetchMessages })

    const { findByText } = render(
      <ChatWindow config={config} transport={transport} persistKey="pk1" />,
    )

    expect(await findByText('Tuoj patikrinsiu!')).toBeTruthy()
    expect(fetchMessages).toHaveBeenCalledWith(CONV_ID)
    // Handoff state is re-checked so an open human episode resumes polling.
    await waitFor(() => expect(transport.poll).toHaveBeenCalledWith(CONV_ID))
  })

  it('ignores a stored conversation older than the resume window', async () => {
    localStorage.setItem(
      'cbz_conv_pk1',
      JSON.stringify({ id: CONV_ID, ts: Date.now() - 25 * 60 * 60 * 1000 }),
    )
    const transport = mockTransport()
    render(<ChatWindow config={config} transport={transport} persistKey="pk1" />)
    await new Promise((r) => setTimeout(r, 0))
    expect(transport.fetchMessages).not.toHaveBeenCalled()
  })

  it('never resumes without a persistKey (configurator preview)', async () => {
    localStorage.setItem(
      'cbz_conv_pk1',
      JSON.stringify({ id: CONV_ID, ts: Date.now() - 60_000 }),
    )
    const transport = mockTransport()
    render(<ChatWindow config={config} transport={transport} />)
    await new Promise((r) => setTimeout(r, 0))
    expect(transport.fetchMessages).not.toHaveBeenCalled()
  })
})
