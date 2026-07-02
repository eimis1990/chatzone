'use client'

import { useState, useTransition } from 'react'
import { GlobeIcon, MailIcon, SendIcon, CheckIcon, CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from '@/lib/date-utils'
import { sendInvitation } from '@/app/(owner)/owner/signups/actions'

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

function statusBadge(s: SignupCardData): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (s.inviteStatus === 'accepted') return { label: 'Accepted', variant: 'default' }
  if (s.inviteStatus === 'expired') return { label: 'Invite expired', variant: 'destructive' }
  if (s.status === 'invited' || s.inviteStatus === 'pending')
    return { label: 'Invited — waiting', variant: 'secondary' }
  return { label: 'New', variant: 'outline' }
}

export function SignupCard({ signup }: { signup: SignupCardData }) {
  const [name, setName] = useState(signup.suggestedName)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const badge = statusBadge(signup)
  const canInvite = signup.status !== 'invited' && signup.inviteStatus !== 'accepted'
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

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {(signup.suggestedName || signup.email).charAt(0).toUpperCase()}
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
        <Badge variant={badge.variant} className="shrink-0 whitespace-nowrap">
          {badge.label}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{signup.source ?? 'unknown'}</span>
        <span>· signed up {formatDistanceToNow(signup.created_at)}</span>
        {signup.invited_at && <span>· invited {formatDistanceToNow(signup.invited_at)}</span>}
      </div>

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
