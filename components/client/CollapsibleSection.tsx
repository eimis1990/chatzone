'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'

/**
 * CollapsibleSection — a config card whose body collapses. The sticky header
 * stays visible with a chevron on the right (vertically centered). Used by every
 * section in the bot configurator so the form is scannable.
 */
export function CollapsibleSection({
  header,
  defaultOpen = false,
  children,
}: {
  header: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="overflow-visible rounded-none border-b pt-0 shadow-none ring-0">
      <CardHeader
        className="header-grid relative sticky top-16 z-[5] cursor-pointer select-none overflow-hidden rounded-none border-b bg-muted/70 py-3 pr-12 backdrop-blur"
        onClick={() => setOpen((o) => !o)}
      >
        {header}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Collapse section' : 'Expand section'}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
        >
          <ChevronDownIcon
            className={`size-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </CardHeader>
      {open && children}
    </Card>
  )
}
