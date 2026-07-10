'use client'

import { cn } from '@/lib/utils'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'

export interface ScrubberProps {
  /** Additional CSS classes */
  className?: string
  /** Number of decimal places to display */
  decimals?: number
  /** Default value for uncontrolled usage */
  defaultValue?: number
  /** Label displayed on the left side of the track */
  label?: string
  /** Hide the visual label while retaining it as the accessible slider name. */
  showLabel?: boolean
  /** Maximum value */
  max?: number
  /** Minimum value */
  min?: number
  /** Called when value changes during interaction */
  onValueChange?: (value: number) => void
  /** Step increment */
  step?: number
  /** Unit appended to the displayed value (e.g. "px") */
  suffix?: string
  /** Number of tick marks (0 to hide) */
  ticks?: number
  /** Controlled value */
  value?: number
  /** Denser presentation for settings grids. */
  size?: 'default' | 'sm'
}

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

const roundToStep = (val: number, step: number, min: number) =>
  Math.round((val - min) / step) * step + min

const Scrubber = ({
  label = 'Value',
  showLabel = true,
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  decimals = 2,
  suffix = '',
  ticks = 9,
  className,
  size = 'default',
}: ScrubberProps) => {
  const shouldReduceMotion = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const range = max - min
  const percentage = range > 0 ? ((value - min) / range) * 100 : 0
  const isActive = isDragging || isHovering
  const compact = size === 'sm'

  const setValue = useCallback(
    (newValue: number) => {
      const clamped = clamp(roundToStep(newValue, step, min), min, max)
      if (!isControlled) {
        setInternalValue(clamped)
      }
      onValueChange?.(clamped)
    },
    [step, min, max, isControlled, onValueChange],
  )

  const getValueFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) {
        return value
      }
      const rect = track.getBoundingClientRect()
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      return min + ratio * range
    },
    [min, range, value],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      trackRef.current?.setPointerCapture(e.pointerId)
      setIsDragging(true)
      setValue(getValueFromPointer(e.clientX))
    },
    [getValueFromPointer, setValue],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) {
        return
      }
      setValue(getValueFromPointer(e.clientX))
    },
    [isDragging, getValueFromPointer, setValue],
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next: number | undefined
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          next = value + step
          break
        case 'ArrowLeft':
        case 'ArrowDown':
          next = value - step
          break
        case 'Home':
          next = min
          break
        case 'End':
          next = max
          break
        default:
          return
      }
      e.preventDefault()
      setValue(next)
    },
    [value, step, min, max, setValue],
  )

  const springConfig = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, duration: 0.25, bounce: 0.1 }

  return (
    <div className={cn('relative w-full select-none', className)}>
      <div
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={Number(value.toFixed(decimals))}
        className="relative cursor-pointer overflow-hidden bg-muted outline-offset-2"
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={trackRef}
        role="slider"
        style={{
          height: compact ? 40 : 52,
          borderRadius: compact ? 'var(--radius-md)' : 12,
          touchAction: 'none',
        }}
        tabIndex={0}
      >
        {/* Fill indicator */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-foreground/14"
          style={{
            borderRadius: compact ? 'var(--radius-md)' : 12,
            width: `${percentage}%`,
            transition: isDragging ? 'none' : 'width 150ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        />

        {/* Tick marks */}
        {ticks > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: ticks }, (_, i) => {
              const pos = ((i + 1) / (ticks + 1)) * 100
              return (
                <div
                  className={cn('absolute bg-foreground/25', compact ? 'top-[72%]' : 'top-1/2')}
                  key={pos}
                  style={{
                    left: `${pos}%`,
                    width: 1,
                    height: 8,
                    borderRadius: 999,
                    transform: 'translateX(-50%) translateY(-50%)',
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Scrub bar (capsule thumb) */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: compact ? '72%' : '50%',
            left: `${percentage}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            marginLeft: -6,
            zIndex: 3,
            transition: isDragging ? 'none' : 'left 150ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <motion.div
            animate={{
              opacity: isActive ? 1 : 0.15,
              scaleX: isActive ? 1 : 0.7,
              scaleY: isActive ? 1 : 0.7,
            }}
            className={cn(
              'transition-colors duration-150',
              isActive ? 'bg-primary' : 'bg-foreground/90',
            )}
            style={{
              width: 5,
              height: compact ? 12 : 34,
              borderRadius: 999,
            }}
            transition={springConfig}
          />
        </div>

        {/* Label */}
        {showLabel ? (
          <div
            className={cn(
              'pointer-events-none absolute whitespace-nowrap text-foreground',
              compact ? 'top-1.5' : 'top-1/2 -translate-y-1/2',
            )}
            style={{
              left: compact ? 14 : 18,
              fontSize: compact ? 14 : 17,
              fontWeight: compact ? 500 : 400,
              zIndex: 4,
            }}
          >
            {label}
          </div>
        ) : null}

        {/* Value display */}
        <div
          className={cn(
            'pointer-events-none absolute text-foreground',
            compact ? 'top-1.5' : 'top-1/2 -translate-y-1/2',
          )}
          style={{
            right: compact ? 12 : 14,
            zIndex: 4,
            fontFamily: 'ui-monospace, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: compact ? 13 : 15,
            fontWeight: 500,
          }}
        >
          {value.toFixed(decimals)}
          {suffix}
        </div>
      </div>
    </div>
  )
}

export default Scrubber
export { Scrubber }
