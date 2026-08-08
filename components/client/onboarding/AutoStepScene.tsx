'use client'

import type { ReactNode } from 'react'

/**
 * Full-card scene for the automated wizard steps (Teach / Store / Look).
 * No controls — an illustration, what's happening, a live status line, and a
 * scanning progress bar. The wizard drives advancement; this only displays.
 */
export function AutoStepScene({
  image,
  title,
  description,
  status,
  stepNumber,
  totalSteps,
}: {
  image: string
  title: string
  description: string
  /** Live sub-status line (e.g. "12 of 15 pages ready"). */
  status?: ReactNode
  stepNumber: number
  totalSteps: number
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-primary/[0.06] via-card to-card">
      <div className="flex min-h-[560px] flex-col items-center justify-center gap-5 px-6 py-14 text-center">
        <span className="rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-semibold text-primary">
          Step {stepNumber} of {totalSteps}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="pointer-events-none h-56 w-auto select-none mix-blend-multiply md:h-72"
        />
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground md:text-base">{description}</p>
        </div>

        <div className="w-full max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
            <div className="h-full w-1/3 rounded-full bg-primary animate-[onboarding-scan_1.6s_ease-in-out_infinite]" />
          </div>
        </div>
        {status && <div className="min-h-5 text-sm text-muted-foreground">{status}</div>}
      </div>
    </div>
  )
}
