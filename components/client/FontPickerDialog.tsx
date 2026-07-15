'use client'

import { useRef, useState } from 'react'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FONT_GROUPS, FONT_OPTIONS } from '@/lib/fonts'
import { cn } from '@/lib/utils'

interface FontPickerDialogProps {
  label: string
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  includeInherit?: boolean
}

export function FontPickerDialog({
  label,
  value,
  onValueChange,
  onBlur,
  includeInherit = false,
}: FontPickerDialogProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const originalValueRef = useRef(value)

  const selectedFont = FONT_OPTIONS.find((font) => font.value === value)
  const displayLabel = value === 'inherit' ? 'Same as chat' : (selectedFont?.label ?? 'Geist')

  const openPicker = () => {
    originalValueRef.current = value
    setDraft(value)
    setOpen(true)
  }

  const cancel = () => {
    setDraft(originalValueRef.current)
    onValueChange(originalValueRef.current)
    onBlur?.()
    setOpen(false)
  }

  const keep = () => {
    originalValueRef.current = draft
    onBlur?.()
    setOpen(false)
  }

  const preview = (next: string) => {
    setDraft(next)
    onValueChange(next)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={openPicker}
        className="h-10 w-full justify-between px-3 font-normal"
        aria-haspopup="dialog"
      >
        <span style={selectedFont ? { fontFamily: selectedFont.stack } : undefined}>{displayLabel}</span>
        <ChevronRightIcon data-icon="inline-end" className="text-muted-foreground" />
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? openPicker() : cancel())}>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg"
          overlayStyle={{ zIndex: 40 }}
        >
          <DialogHeader>
            <DialogTitle>Choose {label.toLowerCase()}</DialogTitle>
            <DialogDescription>
              Try as many as you like. Changes appear in the live chat until you keep or cancel them.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-5 overflow-y-auto pr-1" role="radiogroup" aria-label={label}>
            {includeInherit ? (
              <button
                type="button"
                role="radio"
                aria-checked={draft === 'inherit'}
                onClick={() => preview('inherit')}
                className={cn(
                  'relative flex min-h-12 w-full cursor-pointer items-center rounded-xl border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  draft === 'inherit'
                    ? 'border-primary bg-primary/8 text-foreground'
                    : 'border-border bg-background hover:bg-muted/60',
                )}
              >
                <span>
                  <span className="block font-medium">Same as chat</span>
                  <span className="block text-xs text-muted-foreground">Follow the chat font automatically</span>
                </span>
                {draft === 'inherit' ? <CheckIcon className="ml-auto size-4 text-primary" aria-hidden="true" /> : null}
              </button>
            ) : null}

            {FONT_GROUPS.map((group) => (
              <section key={group.value} aria-labelledby={`font-group-${group.value}`}>
                <div className="mb-2">
                  <h3 id={`font-group-${group.value}`} className="text-sm font-semibold">{group.label}</h3>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.fonts.map((font) => {
                    const selected = draft === font.value
                    return (
                      <button
                        key={font.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => preview(font.value)}
                        className={cn(
                          'relative flex min-h-12 cursor-pointer items-center rounded-xl border px-3 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                          selected
                            ? 'border-primary bg-primary/8 text-foreground shadow-sm'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-muted/60',
                        )}
                        style={{ fontFamily: font.stack }}
                      >
                        <span>{font.label}</span>
                        {selected ? <CheckIcon className="ml-auto size-4 text-primary" aria-hidden="true" /> : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancel}>Cancel</Button>
            <Button type="button" onClick={keep}>Keep</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
