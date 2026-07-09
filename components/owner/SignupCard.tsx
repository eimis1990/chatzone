'use client'

import { useState, useTransition } from 'react'
import { GlobeIcon, MailIcon, SendIcon, CheckIcon, CopyIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/date-utils'
import { sendInvitation, resendInvitation, deleteSignup } from '@/app/(owner)/owner/signups/actions'

export interface SignupCardData {
  id: string
  email: string
  website: string | null
  source: string | null
  status: string | null
  invited_at: string | null
  created_at: string
  /** Latest invites-table status for this email ('accepted' | 'expired' | 'pending' | null). */
  inviteStatus: string | null
  /** Prefill derived from the website domain. */
  suggestedName: string
}

/** A clean, colour-coded status pill per signup state. */
function statusBadge(s: SignupCardData): { label: string; className: string } {
  if (s.inviteStatus === 'accepted') return { label: 'Accepted', className: 'bg-green-100 text-green-700' }
  if (s.inviteStatus === 'expired') return { label: 'Invite expired', className: 'bg-red-100 text-red-700' }
  if (s.status === 'invited' || s.inviteStatus === 'pending')
    return { label: 'Invited', className: 'bg-amber-100 text-amber-700' }
  return { label: 'New', className: 'bg-slate-100 text-slate-600' }
}

export function SignupCard({ signup }: { signup: SignupCardData }) {
  const [name, setName] = useState(signup.suggestedName)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const badge = statusBadge(signup)
  const accepted = signup.inviteStatus === 'accepted'
  const canInvite = signup.status !== 'invited' && signup.inviteStatus !== 'accepted'
  const canResend =
    (signup.status === 'invited' || signup.inviteStatus === 'expired') &&
    signup.inviteStatus !== 'accepted'
  const websiteHref = signup.website
    ? /^https?:\/\//i.test(signup.website)
      ? signup.website
      : `https://${signup.website}`
    : null

  const onInvite = () => {
    startTransition(async () => {
      const res = await sendInvitation(signup.id, name)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setInviteUrl(res.inviteUrl)
      toast.success(
        res.emailed ? `Invitation emailed to ${signup.email}` : 'Client created — copy the invite link below',
      )
    })
  }

  const onResend = () => {
    startTransition(async () => {
      const res = await resendInvitation(signup.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setInviteUrl(res.inviteUrl)
      toast.success(
        res.emailed ? `Invitation re-sent to ${signup.email}` : 'New invite link ready — copy it below',
      )
    })
  }

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteSignup(signup.id)
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to remove signup')
        return
      }
      setConfirmOpen(false)
      toast.success(`Removed ${signup.email}`)
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md',
        accepted ? 'bg-muted/30' : 'bg-card',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            accepted ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary',
          )}
        >
          {accepted ? (
            <CheckIcon className="size-5" />
          ) : (
            (signup.suggestedName || signup.email).charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={signup.email}>
            {signup.suggestedName || signup.email.split('@')[0]}
          </p>
          <a
            href={`mailto:${signup.email}`}
            className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline"
          >
            <MailIcon className="size-3 shrink-0" />
            {signup.email}
          </a>
          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline"
            >
              <GlobeIcon className="size-3 shrink-0" />
              {signup.website}
            </a>
          )}
        </div>
        <Badge className={cn('shrink-0 whitespace-nowrap border-transparent', badge.className)}>
          {badge.label}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{signup.source ?? 'unknown'}</span>
          <span>· signed up {formatDistanceToNow(signup.created_at)}</span>
          {signup.invited_at && <span>· invited {formatDistanceToNow(signup.invited_at)}</span>}
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label={`Remove ${signup.email} from signups`}
          title="Remove signup"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Remove this signup?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{signup.email}</span> will be removed
            from the list permanently. Any client or invitation you already created stays intact.
          </DialogDescription>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              {pending ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {canInvite && !inviteUrl && (
        <div className="flex gap-2 border-t pt-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Company name"
            className="h-8 flex-1 text-sm"
            maxLength={80}
          />
          <Button size="sm" className="h-8 gap-1.5" disabled={pending || !name.trim()} onClick={onInvite}>
            {pending ? (
              'Sending…'
            ) : (
              <>
                <SendIcon className="size-3.5" />
                Send invitation
              </>
            )}
          </Button>
        </div>
      )}

      {canResend && !inviteUrl && (
        <div className="flex justify-end border-t pt-3">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={pending}
            onClick={onResend}
          >
            <SendIcon className="size-3.5" />
            {pending ? 'Sending…' : 'Resend invitation'}
          </Button>
        </div>
      )}

      {inviteUrl && (
        <div className="flex items-center gap-2 border-t pt-3 text-xs">
          <CheckIcon className="size-3.5 shrink-0 text-green-600" />
          <span className="min-w-0 truncate text-muted-foreground" title={inviteUrl}>
            {inviteUrl}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 gap-1 px-2"
            onClick={() => {
              void navigator.clipboard.writeText(inviteUrl)
              toast.success('Invite link copied')
            }}
          >
            <CopyIcon className="size-3" />
            Copy
          </Button>
        </div>
      )}
    </div>
  )
}
