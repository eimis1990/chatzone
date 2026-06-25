import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  icon: LucideIcon
  title: string
  description?: string
  /** 'primary' (accent chip) or 'danger' (red chip). */
  accent?: 'primary' | 'danger'
  contentClassName?: string
  children: ReactNode
}

/** A white card with an iconed header — the shared section style across screens. */
export function SectionCard({
  icon: Icon,
  title,
  description,
  accent = 'primary',
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md',
              accent === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-primary text-primary-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className={cn('text-sm font-semibold', accent === 'danger' && 'text-destructive')}>
              {title}
            </CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
