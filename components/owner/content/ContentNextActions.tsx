'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightIcon, SparklesIcon } from 'lucide-react'
import { toast } from 'sonner'
import { updateContentStatus } from '@/app/(owner)/owner/content/actions'
import { ContentStudioGuide, lifecycleStageForStatus } from '@/components/owner/content/ContentStudioChrome'
import { Button, buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getContentSuggestions } from '@/lib/content-studio/suggestions'
import type { ContentItem, ContentPublicationTarget } from '@/lib/content-studio/types'
import { cn } from '@/lib/utils'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not start this action'
}

export function ContentNextActions({ items, targets }: { items: ContentItem[]; targets: ContentPublicationTarget[] }) {
  const router = useRouter()
  const suggestions = useMemo(() => getContentSuggestions(items, targets), [items, targets])
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function run(suggestion: ReturnType<typeof getContentSuggestions>[number]) {
    if (!suggestion.itemId || !suggestion.transitionTo) return
    setPendingId(suggestion.id)
    try {
      await updateContentStatus(suggestion.itemId, suggestion.transitionTo)
      toast.success('Drafting started')
      router.push(suggestion.href)
    } catch (error) {
      toast.error(errorMessage(error))
      setPendingId(null)
    }
  }

  if (suggestions.length === 0) return null

  const [primary, ...secondary] = suggestions
  const primaryItem = primary.itemId ? items.find((item) => item.id === primary.itemId) : undefined
  const primaryAction = primary.transitionTo ? (
    <Button variant="inverse" size="lg" onClick={() => void run(primary)} disabled={Boolean(pendingId)}>
      {pendingId === primary.id ? (
        <><Spinner /> Starting…</>
      ) : (
        <>{primary.actionLabel}<ArrowRightIcon data-icon="inline-end" /></>
      )}
    </Button>
  ) : (
    <Link href={primary.href} className={cn(buttonVariants({ variant: 'inverse', size: 'lg' }), 'min-h-11')}>
      {primary.actionLabel}<ArrowRightIcon data-icon="inline-end" />
    </Link>
  )

  return (
    <div className="grid gap-2">
      <ContentStudioGuide
        icon={SparklesIcon}
        eyebrow={`Recommended next${suggestions.length > 1 ? ` · ${suggestions.length} actions` : ''}`}
        title={primary.title}
        description={primary.description}
        currentStage={lifecycleStageForStatus(primaryItem?.status)}
        action={primaryAction}
      />
      {secondary.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Also suggested</span>
          {secondary.map((suggestion) => suggestion.transitionTo ? (
            <Button key={suggestion.id} variant="link" size="xs" onClick={() => void run(suggestion)} disabled={Boolean(pendingId)}>
              {suggestion.actionLabel}<ArrowRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <Link key={suggestion.id} href={suggestion.href} className="font-medium underline-offset-4 hover:text-foreground hover:underline">
              {suggestion.actionLabel}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
