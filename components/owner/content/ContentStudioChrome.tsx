import type { LucideIcon } from 'lucide-react'
import { ArrowLeftIcon, CheckIcon, CircleIcon, CircleStopIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { ContentStatus } from '@/lib/content-studio/types'
import { cn } from '@/lib/utils'

const LIFECYCLE_STAGES = ['Brief', 'Draft', 'Review', 'PR', 'Live'] as const

export type ContentLifecycleStage = 0 | 1 | 2 | 3 | 4

export function lifecycleStageForStatus(status?: ContentStatus): ContentLifecycleStage {
  if (!status || status === 'idea' || status === 'researching' || status === 'brief') return 0
  if (status === 'drafting' || status === 'failed') return 1
  if (status === 'review' || status === 'ready') return 2
  if (status === 'pr_open') return 3
  return 4
}

export function ContentStudioHeader({
  title,
  description,
  badge,
  backHref,
  actions,
}: {
  title: string
  description: string
  badge?: string
  backHref?: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 items-start gap-3">
        {backHref && (
          <Link href={backHref} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), '-ml-2 mt-0.5')} aria-label="Back to Content Studio">
            <ArrowLeftIcon />
          </Link>
        )}
        <div className="grid min-w-0 gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {badge && <Badge variant="outline">{badge}</Badge>}
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  )
}

export function ContentLifecycle({ currentStage }: { currentStage: ContentLifecycleStage }) {
  return (
    <div className="no-scrollbar overflow-x-auto" aria-label="Content publishing progress">
      <ol className="flex min-w-[26rem] items-start" aria-label="Brief, draft, review, pull request, and live stages">
        {LIFECYCLE_STAGES.map((stage, index) => {
          const complete = index < currentStage
          const current = index === currentStage
          return (
            <li key={stage} className="flex flex-1 items-start last:flex-none">
              <div className="grid justify-items-center gap-1.5">
                <span className="grid size-6 place-items-center text-foreground" aria-current={current ? 'step' : undefined}>
                  {complete ? <CheckIcon className="rounded-full bg-background p-1" aria-hidden="true" /> : current ? <CircleStopIcon aria-hidden="true" /> : <CircleIcon className="opacity-55" aria-hidden="true" />}
                </span>
                <span className={cn('text-xs font-medium', !complete && !current && 'opacity-65')}>{stage}</span>
              </div>
              {index < LIFECYCLE_STAGES.length - 1 && (
                <Separator className={cn('mt-3 min-w-8 flex-1 bg-foreground/25', index < currentStage && 'bg-foreground')} />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function ContentStudioGuide({
  icon: Icon,
  eyebrow,
  title,
  description,
  currentStage,
  action,
}: {
  icon: LucideIcon
  eyebrow?: string
  title: string
  description: string
  currentStage: ContentLifecycleStage
  action?: ReactNode
}) {
  return (
    <section className="rounded-xl bg-primary px-4 py-4 text-foreground sm:px-6 sm:py-5" aria-labelledby="content-guide-title">
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(25rem,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-foreground text-background">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="grid min-w-0 gap-1">
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">{eyebrow}</p>}
            <h2 id="content-guide-title" className="text-lg font-semibold leading-tight sm:text-xl">{title}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-foreground/75">{description}</p>
          </div>
        </div>
        <ContentLifecycle currentStage={currentStage} />
        {action && <div className="flex shrink-0 lg:justify-end">{action}</div>}
      </div>
    </section>
  )
}
