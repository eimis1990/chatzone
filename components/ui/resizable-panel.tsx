'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResizablePanelProps {
  children: ReactNode
  defaultWidth?: number
  /** If set, the initial width is this fraction of the parent's width (clamped to min/max). */
  defaultFraction?: number
  min?: number
  max?: number
  className?: string
}

/**
 * A panel whose width the user can drag from its right edge. Content scrolls
 * vertically inside. Lightweight (no dependency) — fits the base-ui/base-nova
 * setup where shadcn's Radix-based `resizable` doesn't apply.
 */
export function ResizablePanel({
  children,
  defaultWidth = 460,
  defaultFraction,
  min = 360,
  max = 760,
  className,
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(defaultWidth)
  const [dragging, setDragging] = useState(false)
  const sizedRef = useRef(false)

  // On mount, size the panel to a fraction of the parent (e.g. half the
  // content view), clamped to the drag bounds. Runs once.
  useEffect(() => {
    if (sizedRef.current || !defaultFraction) return
    const parent = containerRef.current?.parentElement
    if (!parent) return
    const pw = parent.getBoundingClientRect().width
    if (pw > 0) {
      setWidth(Math.min(max, Math.max(min, Math.round(pw * defaultFraction))))
      sizedRef.current = true
    }
  }, [defaultFraction, min, max])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startW = width
      setDragging(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: PointerEvent) => {
        setWidth(Math.min(max, Math.max(min, startW + ev.clientX - startX)))
      }
      const onUp = () => {
        setDragging(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [width, min, max],
  )

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full flex-shrink-0 border-r bg-background', className)}
      style={{ width }}
    >
      <div className="h-full overflow-y-auto">{children}</div>

      {/* Drag handle on the right edge */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        onPointerDown={onPointerDown}
        className={cn(
          'group absolute inset-y-0 right-0 z-10 w-2 translate-x-1/2 cursor-col-resize',
          'flex items-center justify-center',
        )}
      >
        <span
          className={cn(
            'h-full w-px bg-border transition-colors',
            'group-hover:bg-primary/40',
            dragging && 'bg-primary/60',
          )}
        />
      </div>
    </div>
  )
}
