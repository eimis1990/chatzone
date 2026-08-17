import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'
import { getEnv } from '@/lib/env'
import { SALES_EMAIL_SENDER } from '@/lib/sales-email-send'

const SMTP_HOST = 'smtp.hostinger.com'
const IMAP_HOST = 'imap.hostinger.com'
const LOGO_CID = 'loqara-logo'

export interface HostingerMailMessage {
  to: string
  subject: string
  text: string
  html: string
}

export interface HostingerMailResult {
  messageId: string
  archived: boolean
  sentMailboxPath: string | null
  sentMailboxUid: number | null
}

export class HostingerMailConfigurationError extends Error {}

async function archiveInSent(rawMessage: Buffer, password: string): Promise<{
  archived: boolean
  path: string | null
  uid: number | null
}> {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: 993,
    secure: true,
    auth: { user: SALES_EMAIL_SENDER, pass: password },
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    logger: false,
  })
  client.on('error', (error) => {
    console.error('[hostinger-mail] IMAP error:', error.message)
  })

  try {
    await client.connect()
    const mailboxes = await client.list()
    const sentMailbox = mailboxes.find((mailbox) => mailbox.specialUse === '\\Sent')
      ?? mailboxes.find((mailbox) => mailbox.path === 'INBOX.Sent')
    if (!sentMailbox) return { archived: false, path: null, uid: null }

    const appended = await client.append(sentMailbox.path, rawMessage, ['\\Seen'], new Date())
    if (!appended) return { archived: false, path: sentMailbox.path, uid: null }

    return {
      archived: true,
      path: sentMailbox.path,
      uid: appended.uid ?? null,
    }
  } catch (error) {
    console.error('[hostinger-mail] could not archive Sent copy:', error)
    return { archived: false, path: null, uid: null }
  } finally {
    if (client.usable) await client.logout().catch(() => undefined)
  }
}

/**
 * Sends one prepared sales email through the real hello@loqara.com Hostinger
 * mailbox. The exact RFC822 message is also appended to the mailbox's Sent
 * folder, so the audit copy and delivered copy share one Message-ID.
 */
export async function sendHostingerMail(message: HostingerMailMessage): Promise<HostingerMailResult> {
  const password = getEnv().HOSTINGER_EMAIL_PASSWORD
  if (!password) {
    throw new HostingerMailConfigurationError('Hostinger email sending is not configured.')
  }

  const logo = await readFile(path.join(process.cwd(), 'public', 'loqara-email-logo.jpg'))
  const mail = {
    from: { name: 'Loqara', address: SALES_EMAIL_SENDER },
    replyTo: SALES_EMAIL_SENDER,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: [{
      filename: 'loqara-email-logo.jpg',
      content: logo,
      contentType: 'image/jpeg',
      cid: LOGO_CID,
    }],
  }

  const builder = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'windows',
  })
  const built = await builder.sendMail(mail)
  const rawMessage = built.message as Buffer

  const smtp = nodemailer.createTransport({
    host: SMTP_HOST,
    port: 465,
    secure: true,
    auth: { user: SALES_EMAIL_SENDER, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  const sent = await smtp.sendMail({
    envelope: { from: SALES_EMAIL_SENDER, to: [message.to] },
    raw: rawMessage,
  })

  const accepted = sent.accepted.map(String).some((recipient) => (
    recipient.toLowerCase() === message.to.toLowerCase()
  ))
  if (!accepted) throw new Error('Hostinger did not accept the recipient.')

  const archived = await archiveInSent(rawMessage, password)
  return {
    messageId: sent.messageId || built.messageId,
    archived: archived.archived,
    sentMailboxPath: archived.path,
    sentMailboxUid: archived.uid,
  }
}
