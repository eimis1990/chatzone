'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending
        ? isSuspended
          ? 'Activating…'
          : 'Suspending…'
        : isSuspended
          ? 'Activate'
          : 'Suspend'}
    </Button>
  )
}
