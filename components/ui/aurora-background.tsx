'use client'

import React, { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: ReactNode
  showRadialGradient?: boolean
}

/**
 * Soft animated aurora wash (Aceternity-style), adapted for Tailwind v4:
 * palette hexes are inlined and the `animate-aurora` keyframes live in
 * globals.css. Fills its parent instead of the viewport.
 */
export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        'transition-bg relative flex h-full flex-col items-center justify-center bg-zinc-50 text-slate-950 dark:bg-zinc-900',
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            `
            [--white-gradient:repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)]
            [--dark-gradient:repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)]
            [--aurora:repeating-linear-gradient(100deg,#3b82f6_10%,#a5b4fc_15%,#93c5fd_20%,#ddd6fe_25%,#60a5fa_30%)]
            [background-image:var(--white-gradient),var(--aurora)]
            dark:[background-image:var(--dark-gradient),var(--aurora)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            blur-[10px] invert dark:invert-0
            after:absolute after:inset-0 after:content-[""]
            after:[background-image:var(--white-gradient),var(--aurora)]
            after:dark:[background-image:var(--dark-gradient),var(--aurora)]
            after:[background-size:200%,_100%]
            after:[background-attachment:fixed] after:mix-blend-difference after:animate-aurora
            pointer-events-none absolute -inset-[10px] opacity-50 will-change-transform`,
            showRadialGradient &&
              '[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]',
          )}
        />
      </div>
      {children}
    </div>
  )
}
