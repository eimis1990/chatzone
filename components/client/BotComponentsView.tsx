'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { XIcon, CheckIcon, RepeatIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WIDGET_COMPONENTS, type WidgetComponentMeta } from '@/lib/widget-components/meta'
import { ComponentPreview } from '@/lib/widget-components/registry'
import { setComponentVariant } from '@/lib/actions/component-variants'

/**
 * A bot's Components page: every component available to its provider folder,
 * rendered with the bot's current variant. "Change" opens a right-side drawer
 * with all variants rendered — picking one applies immediately.
 */
export function BotComponentsView({
  botId,
  assignedKeys,
  currentVariants,
}: {
  botId: string
  assignedKeys: string[]
  /** config.components — componentKey → variantId. */
  currentVariants: Record<string, string>
}) {
  const router = useRouter()
  const [changing, setChanging] = useState<WidgetComponentMeta | null>(null)

  const assigned = WIDGET_COMPONENTS.filter((c) => assignedKeys.includes(c.key))

  if (assigned.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No visual components are available for this assistant yet.
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {assigned.map((meta) => {
          const variantId = currentVariants[meta.key] ?? meta.variants[0]?.id
          const variant = meta.variants.find((v) => v.id === variantId) ?? meta.variants[0]
          return (
            <div
              key={meta.key}
              className="flex min-h-[220px] flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:border-foreground/15 hover:shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{meta.name}</p>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>
              <div className="pointer-events-none flex-1 overflow-hidden rounded-lg border bg-white p-3">
                <ComponentPreview componentKey={meta.key} variantId={variant?.id} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {variant?.name ?? 'Standard'}
                </span>
                {meta.variants.length > 1 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setChanging(meta)}>
                    <RepeatIcon className="size-3.5" /> Change
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {changing && (
        <VariantDrawer
          botId={botId}
          meta={changing}
          currentVariantId={currentVariants[changing.key] ?? changing.variants[0]?.id}
          onClose={() => setChanging(null)}
          onChanged={() => {
            setChanging(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function VariantDrawer({
  botId,
  meta,
  currentVariantId,
  onClose,
  onChanged,
}: {
  botId: string
  meta: WidgetComponentMeta
  currentVariantId?: string
  onClose: () => void
  onChanged: () => void
}) {
  const [saving, setSaving] = useState<string | null>(null)

  const apply = async (variantId: string) => {
    setSaving(variantId)
    try {
      const res = await setComponentVariant(botId, meta.key, variantId)
      if (!res.success) throw new Error(res.error)
      toast.success('Component updated — live for new conversations')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
      setSaving(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`Choose a ${meta.name} style`}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold">{meta.name}</p>
            <p className="text-xs text-muted-foreground">Pick the style your visitors see.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {meta.variants.map((v) => {
            const isCurrent = v.id === currentVariantId
            const inert = saving !== null || isCurrent
            const pick = () => {
              if (!inert) void apply(v.id)
            }
            return (
              // div[role=button]: previews contain real <button>s — a <button>
              // wrapper would nest them (invalid HTML, hydration error).
              <div
                key={v.id}
                role="button"
                tabIndex={inert ? -1 : 0}
                aria-disabled={inert}
                onClick={pick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    pick()
                  }
                }}
                className={cn(
                  'w-full rounded-xl border bg-card p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isCurrent
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'cursor-pointer hover:border-foreground/20',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.description}</p>
                  </div>
                  {isCurrent ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <CheckIcon className="size-3" /> Current
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {saving === v.id ? 'Applying…' : 'Use this'}
                    </span>
                  )}
                </div>
                <div className="pointer-events-none mt-2 overflow-hidden rounded-lg border bg-white p-3">
                  <ComponentPreview componentKey={meta.key} variantId={v.id} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
