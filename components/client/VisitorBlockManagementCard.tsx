'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type {
  VisitorBlockManagementAction,
  VisitorBlockManagementResult,
} from '@/lib/visitor-block-shared'

interface VisitorBlockManagementCardProps {
  expiresAt: string
  onAction: (action: VisitorBlockManagementAction) => Promise<VisitorBlockManagementResult>
  onChange: (expiresAt: string | null) => void
}

function formatBlockedUntil(expiresAt: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(expiresAt))
}

export function VisitorBlockManagementCard({
  expiresAt,
  onAction,
  onChange,
}: VisitorBlockManagementCardProps) {
  const [pendingAction, setPendingAction] = useState<VisitorBlockManagementAction | null>(null)

  async function handleAction(action: VisitorBlockManagementAction) {
    setPendingAction(action)
    try {
      const result = await onAction(action)
      onChange(result.expiresAt)
      if (action === 'unblock') {
        toast.success('Visitor unblocked')
      } else if (result.blocked) {
        toast.success('Block extended by 24 hours')
      } else {
        toast.info('This block has already expired')
      }
    } catch (error) {
      console.error('[visitor-blocks] Management action failed', error)
      toast.error(action === 'unblock' ? 'Could not unblock visitor' : 'Could not extend block')
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Blocked</CardTitle>
        <CardDescription>
          Until{' '}
          <time dateTime={expiresAt} suppressHydrationWarning>
            {formatBlockedUntil(expiresAt)}
          </time>
        </CardDescription>
        <CardAction>
          <Badge variant="destructive">Active</Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={pendingAction !== null}
          onClick={() => handleAction('unblock')}
        >
          {pendingAction === 'unblock' ? 'Unblocking…' : 'Unblock'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="xs"
          disabled={pendingAction !== null}
          onClick={() => handleAction('extend')}
        >
          {pendingAction === 'extend' ? 'Extending…' : 'Extend block'}
        </Button>
      </CardFooter>
    </Card>
  )
}
