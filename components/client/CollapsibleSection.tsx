'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDownIcon, type LucideIcon } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Standard header for a CollapsibleSection: dark icon tile + title/description.
 * One component so every configurator section (including Voice and the Product
 * visualizer, which live in their own files) stays visually identical.
 */
export function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="relative z-10 flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#101213] text-white group-data-[expanded=true]/config-section:bg-white/10">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div>
        <CardTitle className="text-sm font-semibold leading-tight group-data-[expanded=true]/config-section:text-white">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs leading-tight group-data-[expanded=true]/config-section:text-white/70">
            {description}
          </CardDescription>
        )}
      </div>
    </div>
  )
}

const EASE = [0.4, 0, 0.2, 1] as const

/**
 * Expand/collapse motion. `staggerChildren`/`delayChildren` propagate through
 * MotionContext to the SettingsGroup items inside (they inherit these variant
 * names), so the white setting cards descend into place one after another.
 */
const bodyVariants = {
  collapsed: { height: 0, opacity: 0 },
  open: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.36, ease: EASE, staggerChildren: 0.09, delayChildren: 0.08 },
  },
}

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
  // Overflow must be hidden while the height animates, but visible once open so
  // Selects, color popovers, and tooltips inside can escape the section bounds.
  const [overflow, setOverflow] = useState<'hidden' | 'visible'>(defaultOpen ? 'visible' : 'hidden')
  return (
    <Card className="gap-0 overflow-visible rounded-none py-0 shadow-none ring-0">
      <CardHeader
        data-expanded={open}
        className={`group/config-section relative sticky top-16 z-[5] cursor-pointer select-none overflow-hidden rounded-none py-3 pr-12 transition-colors duration-200 ${
          open ? 'bg-[#101213] text-white' : 'border-b bg-card'
        }`}
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
          className={`absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors ${
            open
              ? 'text-white hover:bg-white/10 hover:text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <ChevronDownIcon
            className={`size-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </CardHeader>
      {/* reducedMotion="user" strips the transform-based descend for users who
          ask for it, while opacity still fades. */}
      <MotionConfig reducedMotion="user">
        {/* No `exit` on purpose: an animated collapse shrinks the scroll
            content over time, which makes the scroll container clamp scrollTop
            every frame and the sticky blurred toolbar repaint → visible flicker
            when collapsing while scrolled. Instant unmount = one reflow, no
            flicker. Expand still animates. */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="body"
              variants={bodyVariants}
              initial="collapsed"
              animate="open"
              style={{ overflow }}
              onAnimationStart={() => setOverflow('hidden')}
              onAnimationComplete={(def) => {
                if (def === 'open') setOverflow('visible')
              }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </Card>
  )
}
