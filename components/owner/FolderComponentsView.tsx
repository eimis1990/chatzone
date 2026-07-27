'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, Trash2Icon, XIcon, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WIDGET_COMPONENTS, type WidgetComponentMeta } from '@/lib/widget-components/meta'
import { ComponentPreview } from '@/lib/widget-components/registry'
import {
  addProviderComponents,
  removeProviderComponent,
} from '@/app/(owner)/owner/components/actions'

export function FolderComponentsView({
  folderId,
  assignedKeys,
}: {
  folderId: string
  assignedKeys: string[]
}) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const assigned = WIDGET_COMPONENTS.filter((c) => assignedKeys.includes(c.key))
  const unassigned = WIDGET_COMPONENTS.filter((c) => !assignedKeys.includes(c.key))

  const remove = useCallback(
    async (meta: WidgetComponentMeta) => {
      if (
        !window.confirm(
          `Remove "${meta.name}" from this folder? Bots on this provider will stop showing it.`,
        )
      )
        return
      setBusy(true)
      try {
        await removeProviderComponent(folderId, meta.key)
        toast.success(`${meta.name} removed`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove')
      } finally {
        setBusy(false)
      }
    },
    [folderId, router],
  )

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {/* Add card — same pattern as Create prompt. */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="group flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 p-4 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground/60 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <PlusIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium">Add components</span>
        </button>

        {assigned.map((meta) => (
          <div
            key={meta.key}
            className="flex min-h-[220px] flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:border-foreground/15 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{meta.name}</p>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {meta.variants.length} variant{meta.variants.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="pointer-events-none flex-1 overflow-hidden rounded-lg border bg-white p-3">
              <ComponentPreview componentKey={meta.key} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-end"
              disabled={busy}
              onClick={() => remove(meta)}
            >
              <Trash2Icon className="size-3.5 text-destructive" />
              <span className="text-destructive">Remove</span>
            </Button>
          </div>
        ))}
      </div>

      {assigned.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — add components so bots on this provider can render them.
        </p>
      )}

      {drawerOpen && (
        <AddComponentsDrawer
          folderId={folderId}
          components={unassigned}
          onClose={() => setDrawerOpen(false)}
          onAdded={() => {
            setDrawerOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

/** Right-side drawer listing unassigned components as rendered cards with multi-select. */
function AddComponentsDrawer({
  folderId,
  components,
  onClose,
  onAdded,
}: {
  folderId: string
  components: WidgetComponentMeta[]
  onClose: () => void
  onAdded: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const add = async () => {
    setSaving(true)
    try {
      await addProviderComponents(folderId, [...selected])
      toast.success(`Added ${selected.size} component${selected.size === 1 ? '' : 's'}`)
      onAdded()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Add components">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold">Add components</p>
            <p className="text-xs text-muted-foreground">
              Select what bots on this provider may render.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {components.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Every component is already in this folder. New components are added in code — they
              appear here automatically.
            </p>
          )}
          {components.map((meta) => {
            const isSelected = selected.has(meta.key)
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => toggle(meta.key)}
                aria-pressed={isSelected}
                className={cn(
                  'w-full rounded-xl border bg-card p-3 text-left transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'hover:border-foreground/20',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{meta.name}</p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <CheckIcon className="size-3.5" />}
                  </span>
                </div>
                <div className="pointer-events-none mt-2 overflow-hidden rounded-lg border bg-white p-3">
                  <ComponentPreview componentKey={meta.key} />
                </div>
              </button>
            )
          })}
        </div>

        <div className="border-t p-3">
          <Button type="button" className="w-full" disabled={saving || selected.size === 0} onClick={add}>
            {saving
              ? 'Adding…'
              : selected.size > 0
                ? `Add ${selected.size} component${selected.size === 1 ? '' : 's'}`
                : 'Select components to add'}
          </Button>
        </div>
      </div>
    </div>
  )
}
