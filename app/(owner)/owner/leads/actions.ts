'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import {
  HostingerMailConfigurationError,
  sendHostingerMail,
} from '@/lib/hostinger-mail'
import {
  renderSalesEmailPlainText,
  SALES_EMAIL_DEMO_RECIPIENT,
  SALES_EMAIL_SENDER,
  SALES_EMAIL_TEMPLATE_ID,
  validateSalesEmailSnapshot,
} from '@/lib/sales-email-send'
import { renderSalesEmailHtml } from '@/lib/sales-email-templates'
import { createServiceClient } from '@/lib/supabase/service'
import type { SalesLeadStatus } from '@/lib/types'

const STATUSES: SalesLeadStatus[] = [
  'ready',
  'email_sent',
  'follow_up_email',
  'wants_demo',
  'demo_ready',
  'demo_presented',
  'testing_bot',
  'rejected',
  'client',
]

/** Owner pipeline: move a sales lead to a new status. */
export async function setLeadStatus(leadId: string, status: SalesLeadStatus): Promise<void> {
  await requireRole('owner')
  if (!STATUSES.includes(status)) throw new Error('Invalid status')
  const svc = createServiceClient()
  const changedAt = new Date().toISOString()
  const { error } = await svc
    .from('sales_leads')
    .update({ status, status_updated_at: changedAt, updated_at: changedAt })
    .eq('id', leadId)
  if (error) throw new Error(`Failed to update lead: ${error.message}`)
  revalidatePath('/owner/leads')
}

export interface SendSalesLeadEmailResult {
  ok: boolean
  code: 'sent' | 'already_sent' | 'invalid' | 'not_configured' | 'failed'
  message: string
  archived?: boolean
  sentAt?: string
  pipelineStatus?: SalesLeadStatus
  messageId?: string
}

/**
 * Owner-confirmed first-touch send. The database claim is created before SMTP
 * so retries/double clicks cannot send the same lead twice. Once SMTP accepts a
 * message we treat it as sent even if saving the Sent-folder copy later fails.
 */
export async function sendSalesLeadEmail(
  leadId: string,
): Promise<SendSalesLeadEmailResult> {
  await requireRole('owner')
  if (!leadId) {
    return { ok: false, code: 'invalid', message: 'Invalid lead.' }
  }

  const svc = createServiceClient()
  const { data: lead, error: leadError } = await svc
    .from('sales_leads')
    .select('id, email, email_subject, email_body, status')
    .eq('id', leadId)
    .maybeSingle()

  if (leadError || !lead) {
    return { ok: false, code: 'invalid', message: 'The selected lead could not be loaded.' }
  }

  const validationError = validateSalesEmailSnapshot({
    recipient: lead.email,
    subject: lead.email_subject,
    body: lead.email_body,
  })
  if (validationError) return { ok: false, code: 'invalid', message: validationError }

  const recipient = lead.email!.trim()
  const subject = lead.email_subject!.trim()
  const body = lead.email_body!.trim()
  const { data: attempt, error: claimError } = await svc
    .from('sales_email_sends')
    .insert({
      lead_id: lead.id,
      kind: 'initial',
      template: SALES_EMAIL_TEMPLATE_ID,
      sender: SALES_EMAIL_SENDER,
      recipient,
      subject,
      body_snapshot: body,
      status: 'sending',
    })
    .select('id')
    .single()

  if (claimError?.code === '23505') {
    return {
      ok: false,
      code: 'already_sent',
      message: 'This lead already has a sent email or an active send. Check Hostinger Sent before trying anything else.',
    }
  }
  if (claimError || !attempt) {
    console.error('[sales-email] could not create send claim:', claimError)
    return { ok: false, code: 'failed', message: 'Could not reserve this email for sending.' }
  }

  try {
    const result = await sendHostingerMail({
      to: recipient,
      subject,
      text: renderSalesEmailPlainText(body),
      html: renderSalesEmailHtml({
        body,
        logoUrl: 'cid:loqara-logo',
      }),
    })
    const sentAt = new Date().toISOString()

    const { error: attemptError } = await svc
      .from('sales_email_sends')
      .update({
        status: 'sent',
        provider_message_id: result.messageId,
        sent_mailbox_path: result.sentMailboxPath,
        sent_mailbox_uid: result.sentMailboxUid,
        completed_at: sentAt,
      })
      .eq('id', attempt.id)

    if (attemptError) {
      console.error('[sales-email] sent but failed to finalize audit:', attemptError)
    }

    const pipelineStatus = (lead.status === 'ready' ? 'email_sent' : lead.status) as SalesLeadStatus
    const leadUpdate: Record<string, string> = {
      initial_email_sent_at: sentAt,
      initial_email_template: SALES_EMAIL_TEMPLATE_ID,
      initial_email_message_id: result.messageId,
      updated_at: sentAt,
    }
    if (lead.status === 'ready') {
      leadUpdate.status = 'email_sent'
      leadUpdate.status_updated_at = sentAt
    }
    const { error: updateError } = await svc
      .from('sales_leads')
      .update(leadUpdate)
      .eq('id', lead.id)

    revalidatePath('/owner/leads')
    if (updateError || attemptError) {
      console.error('[sales-email] provider accepted email but database update was incomplete:', updateError)
      return {
        ok: true,
        code: 'sent',
        message: 'Hostinger accepted the email, but its local audit record needs manual checking. Do not send it again.',
        archived: result.archived,
        sentAt,
        pipelineStatus,
        messageId: result.messageId,
      }
    }

    return {
      ok: true,
      code: 'sent',
      message: result.archived
        ? 'Email sent and saved in Hostinger Sent.'
        : 'Email sent, but the Hostinger Sent copy could not be saved. Do not send it again.',
      archived: result.archived,
      sentAt,
      pipelineStatus,
      messageId: result.messageId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error'
    await svc
      .from('sales_email_sends')
      .update({
        status: 'failed',
        error: message.slice(0, 500),
        completed_at: new Date().toISOString(),
      })
      .eq('id', attempt.id)

    const notConfigured = error instanceof HostingerMailConfigurationError
    if (!notConfigured) console.error('[sales-email] send failed:', error)
    return {
      ok: false,
      code: notConfigured ? 'not_configured' : 'failed',
      message: notConfigured
        ? 'Hostinger sending is not configured yet. Add HOSTINGER_EMAIL_PASSWORD to the server environment.'
        : 'Hostinger did not accept the email. Nothing was marked as sent.',
    }
  }
}

export interface SendSalesLeadDemoEmailResult {
  ok: boolean
  code: 'sent' | 'invalid' | 'not_configured' | 'failed'
  message: string
  archived?: boolean
}

/**
 * Sends the lead's current Clean update email to the owner's personal inbox.
 * Demo sends are intentionally repeatable and never alter the lead's audit or
 * pipeline state.
 */
export async function sendSalesLeadDemoEmail(
  leadId: string,
): Promise<SendSalesLeadDemoEmailResult> {
  await requireRole('owner')
  if (!leadId) return { ok: false, code: 'invalid', message: 'Invalid lead.' }

  const svc = createServiceClient()
  const { data: lead, error } = await svc
    .from('sales_leads')
    .select('email_subject, email_body')
    .eq('id', leadId)
    .maybeSingle()

  if (error || !lead) {
    return { ok: false, code: 'invalid', message: 'The selected lead could not be loaded.' }
  }

  const validationError = validateSalesEmailSnapshot({
    recipient: SALES_EMAIL_DEMO_RECIPIENT,
    subject: lead.email_subject,
    body: lead.email_body,
  })
  if (validationError) return { ok: false, code: 'invalid', message: validationError }

  const subject = lead.email_subject!.trim()
  const body = lead.email_body!.trim()

  try {
    const result = await sendHostingerMail({
      to: SALES_EMAIL_DEMO_RECIPIENT,
      subject,
      text: renderSalesEmailPlainText(body),
      html: renderSalesEmailHtml({ body, logoUrl: 'cid:loqara-logo' }),
    })

    return {
      ok: true,
      code: 'sent',
      message: result.archived
        ? `Demo sent to ${SALES_EMAIL_DEMO_RECIPIENT} and saved in Hostinger Sent.`
        : `Demo sent to ${SALES_EMAIL_DEMO_RECIPIENT}, but the Hostinger Sent copy could not be saved.`,
      archived: result.archived,
    }
  } catch (sendError) {
    const notConfigured = sendError instanceof HostingerMailConfigurationError
    if (!notConfigured) console.error('[sales-email] demo send failed:', sendError)
    return {
      ok: false,
      code: notConfigured ? 'not_configured' : 'failed',
      message: notConfigured
        ? 'Hostinger sending is not configured yet. Add HOSTINGER_EMAIL_PASSWORD to the server environment.'
        : 'Hostinger did not accept the demo email.',
    }
  }
}
