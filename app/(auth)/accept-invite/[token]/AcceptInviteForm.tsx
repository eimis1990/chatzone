'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircleIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shimmer } from '@/components/landing/Shimmer'

interface Props {
  token: string
  email: string
  orgName: string
}

/**
 * Celebratory burst on a successful account creation — same canvas-confetti
 * recipe and brand tint as the landing Get Started dialog.
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

export function AcceptInviteForm({ token, email, orgName }: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, fullName, password }),
    })

    const data: { error?: string } = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    // Celebrate from the button's position, then hand off to sign-in. Stay in
    // the loading state so the form stays disabled while the confetti plays.
    const rect = submitRef.current?.getBoundingClientRect()
    const origin = rect
      ? {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        }
      : { x: 0.5, y: 0.6 }
    void celebrate(origin)
    setTimeout(() => router.push('/login?invited=1'), 900)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          readOnly
          disabled
          aria-label="Your email address (pre-filled from invite)"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="orgName">Organization</Label>
        <Input
          id="orgName"
          type="text"
          value={orgName}
          readOnly
          disabled
          aria-label="Your organization (pre-filled from invite)"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Smith"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          disabled={loading}
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
        className="relative mt-1 inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover disabled:opacity-70"
      >
        <span className="relative z-10 inline-flex items-center gap-2">
          {loading && <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />}
          {loading ? 'Creating account…' : 'Create account'}
        </span>
        <Shimmer />
      </button>
    </form>
  )
}
