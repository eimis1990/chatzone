'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CirclePauseIcon, CirclePlayIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toggleOrgStatus } from '@/app/(owner)/owner/clients/[orgId]/actions'

interface SuspendToggleProps {
  orgId: string
  currentStatus: 'active' | 'suspended'
}

export function SuspendToggle({ orgId, currentStatus }: SuspendToggleProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggle() {
    startTransition(async () => {
      await toggleOrgStatus(orgId, currentStatus)
      router.refresh()
    })
  }

  const isSuspended = currentStatus === 'suspended'

  return (
    <Button
      variant={isSuspended ? 'default' : 'destructive'}
      className="h-11"
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? (
        <Spinner data-icon="inline-start" />
      ) : isSuspended ? (
        <CirclePlayIcon data-icon="inline-start" />
      ) : (
        <CirclePauseIcon data-icon="inline-start" />
      )}
      {isPending
        ? isSuspended
          ? 'Activating…'
          : 'Suspending…'
        : isSuspended
          ? 'Activate client'
          : 'Suspend client'}
    </Button>
  )
}
