'use client'

import { useId, useRef, useState } from 'react'
import { LoaderCircleIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shimmer } from './Shimmer'
import { trackEvent } from '@/lib/analytics'

/**
 * Celebratory burst on a successful signup — same canvas-confetti recipe the
 * onboarding wizard uses (see components/client/onboarding/StepInstall.tsx),
 * tinted with the landing brand colors. zIndex lifts it above the dialog (z-50).
 */
async function celebrate(origin: { x: number; y: number }) {
  const { default: confetti } = await import('canvas-confetti')
  confetti({
    particleCount: 110,
    spread: 80,
    startVelocity: 42,
    origin,
    colors: ['#e97634', '#ffffff', '#f3b89a', '#4ade80'],
    scalar: 0.9,
    ticks: 220,
    zIndex: 100,
    disableForReducedMotion: true,
  })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** "my-store.com" → "https://my-store.com"; leaves proper URLs (and blanks) alone. */
function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** Human-friendly domain for the success copy ("https://www.foo.com/x" → "foo.com"). */
function domainOf(website: string): string | null {
  try {
    return new URL(website).hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

/**
 * The landing page's single signup capture: a "Get started" trigger button
 * (each location styles its own via `triggerClassName`) opening a two-step
 * dialog — website + email form → confetti success. Posts to /api/signup with
 * the per-location `source` so acquisition analytics stay comparable.
 */
export function GetStartedDialog({
  source,
  label = 'Get started',
  triggerClassName,
  shimmer = false,
  onOpen,
}: {
  /** Where the trigger lives ("hero" | "cta" | "nav") — sent to the API + analytics. */
  source: string
  label?: string
  /** Full class list for the trigger button — each location styles its own. */
  triggerClassName?: string
  /** Adds the landing "shiny button" sweep inside the trigger (needs overflow-hidden + relative in triggerClassName). */
  shimmer?: boolean
  /** Called when the dialog opens — e.g. to close the mobile nav menu behind it. */
  onOpen?: () => void
}) {
  const websiteId = useId()
  const emailId = useId()
  const companyId = useId()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [company, setCompany] = useState('')
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [doneName, setDoneName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submitRef = useRef<HTMLButtonElement>(null)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) return
    // A fresh visit after a completed signup starts back at the form.
    if (step === 'done') {
      setStep('form')
      setCompany('')
      setWebsite('')
      setEmail('')
    }
    setError('')
    trackEvent('get_started_opened', { source })
    onOpen?.()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const cleanCompany = company.trim()
    if (!cleanCompany) {
      setError('Please enter your company name.')
      return
    }
    const cleanEmail = email.trim()
    if (!EMAIL_RE.test(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    const site = normalizeWebsite(website)
    setLoading(true)
    setError('')
    trackEvent('signup_submitted', { source })
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          company: cleanCompany,
          ...(site ? { website: site } : {}),
          source,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (res.ok && data.ok) {
        trackEvent('signup_succeeded', { source })
        // Capture the button's screen position before the step swaps, then celebrate.
        const rect = submitRef.current?.getBoundingClientRect()
        const origin = rect
          ? {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight,
            }
          : { x: 0.5, y: 0.55 }
        setDoneName(cleanCompany || domainOf(site))
        setStep('done')
        void celebrate(origin)
      } else {
        const message =
          res.status === 429
            ? 'Too many attempts — please wait a minute and try again.'
            : (data.error ?? 'Something went wrong — please try again.')
        setError(message)
        trackEvent('signup_failed', {
          source,
          reason: res.status === 429 ? 'rate_limited' : (data.error ?? 'unknown'),
        })
      }
    } catch {
      setError('Network error — please try again.')
      trackEvent('signup_failed', { source, reason: 'network' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={triggerClassName}>
        {shimmer ? (
          <>
            <span className="relative z-10">{label}</span>
            <Shimmer />
          </>
        ) : (
          label
        )}
      </DialogTrigger>
      <DialogContent className="gap-0 p-6 sm:max-w-md sm:p-8">
        {step === 'form' ? (
          <>
            <img
              src="/loqara-logo-colorful.webp"
              alt=""
              aria-hidden="true"
              className="mx-auto size-16 object-contain"
            />
            <DialogTitle className="mt-4 text-xl tracking-tight sm:text-2xl">
              Let&apos;s get your assistant started
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              Tell us who you are — we&apos;ll set everything up and reach out within a day.
            </DialogDescription>
            <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={companyId}>Company name</Label>
                <Input
                  id={companyId}
                  type="text"
                  required
                  autoComplete="organization"
                  maxLength={80}
                  placeholder="e.g. Home by NB"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={emailId}>Email</Label>
                <Input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={200}
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={websiteId}>
                  Your website{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id={websiteId}
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  maxLength={200}
                  placeholder="https://your-store.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  onBlur={() => setWebsite((w) => normalizeWebsite(w))}
                  className="h-11"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                ref={submitRef}
                type="submit"
                disabled={loading}
                className="relative mt-1 inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover disabled:opacity-70"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  {loading && (
                    <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                  )}
                  {loading ? 'Sending…' : 'Continue'}
                </span>
                <Shimmer />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <img
              src="/loqara-logo-colorful.webp"
              alt=""
              aria-hidden="true"
              className="size-16 object-contain"
            />
            <DialogTitle className="mt-5 text-xl tracking-tight sm:text-2xl">
              You&apos;re on the list! 🎉
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-xs text-balance">
              We&apos;ll reach out within a day to get{' '}
              <span className="font-medium text-foreground">{doneName ?? 'your site'}</span>{' '}
              talking.
            </DialogDescription>
            <p className="mt-5 text-xs text-muted-foreground/80">
              You can close this window — we&apos;ll take it from here.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
