'use client'

import { useMemo, useState } from 'react'
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  LoaderCircleIcon,
  MailIcon,
  SendIcon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { sendSalesLeadEmail } from '@/app/(owner)/owner/leads/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SALES_EMAIL_SENDER, SALES_EMAIL_TEMPLATE_ID } from '@/lib/sales-email-send'
import {
  renderSalesEmailHtml,
  SALES_EMAIL_TEMPLATE,
  type SalesEmailTemplateId,
} from '@/lib/sales-email-templates'
import type { SalesLeadStatus } from '@/lib/types'

function EmailFrame({ body, thumbnail = false }: { body: string; thumbnail?: boolean }) {
  const [documentHeight, setDocumentHeight] = useState(900)
  const srcDoc = useMemo(
    () => renderSalesEmailHtml({ body, logoUrl: '/loqara-email-logo.jpg' }),
    [body],
  )

  if (thumbnail) {
    return (
      <div className="h-56 overflow-hidden bg-stone-100" aria-hidden="true">
        <iframe
          srcDoc={srcDoc}
          title=""
          tabIndex={-1}
          className="pointer-events-none h-[448px] w-[200%] origin-top-left scale-50 border-0 bg-stone-100"
        />
      </div>
    )
  }

  return (
    <iframe
      srcDoc={srcDoc}
      title="Rendered email preview"
      className="block w-full border-0 bg-stone-100"
      style={{ height: documentHeight }}
      onLoad={(event) => {
        const height = event.currentTarget.contentDocument?.documentElement.scrollHeight
        if (height) setDocumentHeight(height)
      }}
    />
  )
}

async function writeStyledEmail(html: string, plainText: string) {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      }),
    ])
    return
  }

  await navigator.clipboard.writeText(plainText)
}

export function LeadEmailTemplates({
  leadId,
  leadName,
  recipient,
  subject,
  body,
  alreadySentAt,
  onPreview,
  onSent,
}: {
  leadId: string
  leadName: string
  recipient: string | null
  subject: string | null
  body: string
  alreadySentAt: string | null
  onPreview: () => void
  onSent: (result: {
    sentAt: string
    template: SalesEmailTemplateId
    messageId: string
    status: SalesLeadStatus
  }) => void
}) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sentLeadId, setSentLeadId] = useState<string | null>(null)
  const hasSent = Boolean(alreadySentAt || sentLeadId === leadId)
  const canSend = Boolean(recipient && subject && body)

  const confirmSend = async () => {
    if (isSending) return
    setIsSending(true)
    try {
      const result = await sendSalesLeadEmail(leadId)
      if (!result.ok || !result.sentAt || !result.pipelineStatus || !result.messageId) {
        toast.error(result.message)
        return
      }

      setSentLeadId(leadId)
      setIsConfirming(false)
      onSent({
        sentAt: result.sentAt,
        template: SALES_EMAIL_TEMPLATE_ID,
        messageId: result.messageId,
        status: result.pipelineStatus,
      })
      if (result.archived) toast.success(result.message)
      else toast.warning(result.message)
    } catch {
      toast.error('Could not send the email')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <section aria-labelledby="email-design-heading">
        <article className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:border-primary/35 hover:shadow-md">
          <div className="flex items-start gap-3 px-4 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MailIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="email-design-heading" className="font-heading text-base font-medium">
                {SALES_EMAIL_TEMPLATE.name}
              </h3>
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                {SALES_EMAIL_TEMPLATE.description} The personalized opening stays unchanged.
              </p>
            </div>
          </div>

          <div className="relative border-y">
            <EmailFrame body={body} thumbnail />
            <button
              type="button"
              className="absolute inset-0 cursor-zoom-in rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={onPreview}
              aria-label="Open Clean update preview"
            />
          </div>

          <div className="space-y-3 px-4 py-3.5">
            <p className="truncate text-xs text-muted-foreground">
              {hasSent ? 'Email sent from Loqara' : `Prepared with ${leadName}'s copy`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={onPreview}>
                <EyeIcon data-icon="inline-start" />
                Preview
              </Button>
              <Button
                className="w-full"
                disabled={!canSend || hasSent}
                title={!canSend ? 'Recipient, subject, and body are required' : undefined}
                onClick={() => setIsConfirming(true)}
              >
                {hasSent ? <CheckIcon data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                {hasSent ? 'Sent' : 'Send email'}
              </Button>
            </div>
          </div>
        </article>
      </section>

      <Dialog
        open={isConfirming}
        onOpenChange={(open) => {
          if (!isSending) setIsConfirming(open)
        }}
      >
        <DialogContent showCloseButton={!isSending} className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheckIcon className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle>Send this email?</DialogTitle>
            <DialogDescription>
              This sends immediately through the Loqara Hostinger mailbox and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <dl className="grid gap-2 rounded-xl border bg-muted/35 p-3 text-sm sm:grid-cols-[76px_1fr]">
            <dt className="text-muted-foreground">From</dt>
            <dd className="truncate font-medium">Loqara &lt;{SALES_EMAIL_SENDER}&gt;</dd>
            <dt className="text-muted-foreground">To</dt>
            <dd className="truncate font-medium">{recipient}</dd>
            <dt className="text-muted-foreground">Subject</dt>
            <dd className="min-w-0 break-words font-medium">{subject}</dd>
            <dt className="text-muted-foreground">Format</dt>
            <dd className="font-medium">{SALES_EMAIL_TEMPLATE.name}</dd>
          </dl>

          <p className="text-xs leading-5 text-muted-foreground">
            The exact prepared subject and body will be sent with styled HTML, a plain-text fallback, and the Loqara signature.
          </p>

          <DialogFooter>
            <Button variant="outline" disabled={isSending} onClick={() => setIsConfirming(false)}>
              Cancel
            </Button>
            <Button disabled={isSending} onClick={() => void confirmSend()}>
              {isSending ? (
                <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
              ) : (
                <SendIcon data-icon="inline-start" />
              )}
              {isSending ? 'Sending…' : 'Send email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function LeadEmailPreviewDialog({
  open,
  onOpenChange,
  leadName,
  recipient,
  subject,
  body,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadName: string
  recipient: string | null
  subject: string | null
  body: string
}) {
  const [copied, setCopied] = useState(false)

  const copyStyledEmail = async () => {
    try {
      await writeStyledEmail(renderSalesEmailHtml({ body }), body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Could not copy the styled email')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent
          showCloseButton={false}
          className="z-[80] flex h-[92dvh] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl bg-background p-0 shadow-2xl ring-1 ring-black/10 sm:w-[calc(100vw-2rem)] sm:max-w-none lg:w-[56vw] lg:max-w-5xl"
          overlayClassName="z-[75] bg-black/50 supports-backdrop-filter:backdrop-blur-[3px]"
        >
          <DialogHeader className="shrink-0 border-b bg-card px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base">{SALES_EMAIL_TEMPLATE.name}</DialogTitle>
                <DialogDescription className="truncate text-xs">Email preview for {leadName}</DialogDescription>
              </div>
              <Button size="sm" onClick={() => void copyStyledEmail()}>
                {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
                {copied ? 'Copied' : 'Copy styled email'}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Close email preview">
                <XIcon />
              </Button>
            </div>
          </DialogHeader>

          <div className="shrink-0 border-b bg-card px-4 py-3 sm:px-6">
            <div className="mx-auto grid max-w-5xl gap-x-5 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
              <span className="text-muted-foreground">To</span>
              <span className="truncate font-medium">{recipient || 'No recipient email'}</span>
              <span className="text-muted-foreground">Subject</span>
              <span className="truncate font-medium">{subject || 'No subject prepared'}</span>
            </div>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto bg-stone-100">
            <div className="mx-auto max-w-[900px] px-3 py-5 sm:px-6 sm:py-8">
              <EmailFrame body={body} />
            </div>
          </main>

          <div className="flex shrink-0 items-center justify-center gap-2 border-t bg-card px-4 py-2 text-xs text-muted-foreground">
            <MailIcon className="size-3.5" aria-hidden="true" />
            Email-safe inline styles · rich HTML + plain-text fallback
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
