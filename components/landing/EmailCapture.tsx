'use client'

import { useRef, useState } from 'react'
import { CheckCircle2Icon } from 'lucide-react'
import { Shimmer } from './Shimmer'
import { trackEvent } from '@/lib/analytics'

/** Celebratory burst on successful signup, fired from a screen-space origin. */
async function celebrate(origin: { x: number; y: number }) {
  const { default: confetti } = await import('canvas-confetti')
  confetti({
    particleCount: 95,
    spread: 78,
    startVelocity: 42,
    origin,
    colors: ['#e97634', '#ffffff', '#f3b89a', '#4ade80'],
    scalar: 0.9,
    ticks: 220,
    disableForReducedMotion: true,
  })
}

/**
 * Early-access email capture for the landing page (hero + final CTA). Posts to
 * /api/signup and shows an inline success state. Styled for dark sections.
 */
export function EmailCapture({
  source,
  className = 'max-w-md',
}: {
  source: string
  /** Width of the form wrapper. Defaults to a compact max-w-md (hero); pass
   *  e.g. "w-full" to let it fill a wider container (CTA). */
  className?: string
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setError('')
    trackEvent('signup_submitted', { source })
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (res.ok && data.ok) {
        // Capture the button's screen position before it unmounts, then celebrate.
        const rect = buttonRef.current?.getBoundingClientRect()
        const origin = rect
          ? {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight,
            }
          : { x: 0.5, y: 0.65 }
        setStatus('done')
        trackEvent('signup_succeeded', { source })
        void celebrate(origin)
      } else {
        setStatus('error')
        setError(data.error ?? 'Something went wrong.')
        trackEvent('signup_failed', { source, reason: data.error ?? 'unknown' })
      }
    } catch {
      setStatus('error')
      setError('Network error — please try again.')
      trackEvent('signup_failed', { source, reason: 'network' })
    }
  }

  if (status === 'done') {
    return (
      <div className={`flex ${className} items-center gap-2 rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-medium text-white backdrop-blur-md`}>
        <CheckCircle2Icon className="size-4 flex-shrink-0 text-primary" />
        Thank you! We&apos;ve got your email — we&apos;ll contact you soon.
      </div>
    )
  }

  return (
    <div className={className}>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your work email"
          aria-label="Work email"
          className="h-12 w-full shrink-0 rounded-full border border-white/10 bg-black/30 px-5 text-sm text-white backdrop-blur-md outline-none placeholder:text-white/50 focus:border-primary focus:ring-2 focus:ring-primary/40 sm:w-auto sm:flex-1"
        />
        <button
          ref={buttonRef}
          type="submit"
          disabled={status === 'loading'}
          className="relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover disabled:opacity-70"
        >
          <span className="relative z-10">{status === 'loading' ? 'Joining…' : 'Get started'}</span>
          <Shimmer />
        </button>
      </form>
      {status === 'error' && <p className="mt-2 pl-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}
