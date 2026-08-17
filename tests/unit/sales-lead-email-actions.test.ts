import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  sendHostingerMail: vi.fn(),
  from: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/auth/guards', () => ({ requireRole: mocks.requireRole }))
vi.mock('@/lib/hostinger-mail', () => ({
  HostingerMailConfigurationError: class HostingerMailConfigurationError extends Error {},
  sendHostingerMail: mocks.sendHostingerMail,
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mocks.from }),
}))

import { sendSalesLeadDemoEmail } from '@/app/(owner)/owner/leads/actions'

const BODY = `Laba diena,

Individualus pastebėjimas.

Esu Eimantas, kuriu „Loqara“.

Ar norėtumėte jį pamatyti?

Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau nerašysiu.`

describe('sales lead demo email action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { email_subject: 'Trumpas pasiūlymas', email_body: BODY },
            error: null,
          }),
        })),
      })),
    })
    mocks.sendHostingerMail.mockResolvedValue({
      messageId: '<demo@example>',
      archived: true,
      sentMailboxPath: 'INBOX.Sent',
      sentMailboxUid: 42,
    })
  })

  it('sends Clean update to the fixed personal inbox without writing an audit row', async () => {
    const result = await sendSalesLeadDemoEmail('lead-1')

    expect(mocks.requireRole).toHaveBeenCalledWith('owner')
    expect(mocks.from).toHaveBeenCalledTimes(1)
    expect(mocks.from).toHaveBeenCalledWith('sales_leads')
    expect(mocks.sendHostingerMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'e.kudarauskas@gmail.com',
      subject: 'Trumpas pasiūlymas',
      text: expect.stringContaining('Eimantas Kudarauskas'),
      html: expect.stringContaining('Trumpai apie Loqara'),
    }))
    expect(result).toMatchObject({ ok: true, code: 'sent', archived: true })
  })
})
