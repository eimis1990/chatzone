'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SendIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { resendClientInvite } from '@/app/(owner)/owner/clients/[orgId]/actions'

/** Re-send (or renew) a client's invitation email from the client detail page. */
export function ResendInviteButton({ inviteId, expired }: { inviteId: string; expired: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      const res = await resendClientInvite(inviteId)
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to resend the invite.')
        return
      }
      toast.success(
        res.emailed
          ? `Invitation ${expired ? 'renewed and ' : ''}re-sent.`
          : `Invitation ${expired ? 'renewed' : 'refreshed'} (email is off — copy the link from the client).`,
      )
      router.refresh()
    })
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
      {pending ? 'Sending…' : expired ? 'Renew invite' : 'Resend invite'}
    </Button>
  )
}
