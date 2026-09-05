'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requestPasswordReset } from './actions'

/**
 * Two-phase page:
 *  1. Request phase  — user enters their email; the server action emails a
 *                      reset link from hello@loqara.com.
 *  2. Recovery phase — the link carries ?token_hash=…; we exchange it for a
 *                      session with verifyOtp, then let the user set a password.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [phase, setPhase] = useState<'request' | 'recovery' | 'done'>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // A reset link lands here with ?token_hash=… — exchange it for a session so
  // updateUser() can run. Consumed once; an expired/used link shows an error.
  useEffect(() => {
    const tokenHash = new URLSearchParams(window.location.search).get('token_hash')
    if (!tokenHash) return
    supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash }).then(({ error: otpError }) => {
      if (otpError) {
        setError('This reset link is invalid or has expired. Request a new one below.')
      } else {
        setPhase('recovery')
      }
      // Drop the token from the address bar either way.
      window.history.replaceState(null, '', window.location.pathname)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  // ── Phase 1: send request email ──────────────────────────────────────────
  async function handleRequestReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const res = await requestPasswordReset(email)

    setLoading(false)

    if (!res.ok) {
      setError(res.error ?? 'Something went wrong. Please try again.')
    } else {
      setMessage('If an account exists for that email, a reset link is on its way.')
    }
  }

  // ── Phase 2: set new password ─────────────────────────────────────────────
  async function handleSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password !== confirm) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setPhase('done')
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        {phase === 'request' && (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
              <CardDescription>
                Enter your email and we will send you a reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestReset} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                {message && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {message}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  <a href="/login" className="underline-offset-4 hover:underline">
                    Back to sign in
                  </a>
                </p>
              </form>
            </CardContent>
          </>
        )}

        {phase === 'recovery' && (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Choose a new password</CardTitle>
              <CardDescription>Enter and confirm your new password below.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetPassword} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
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
                    placeholder="Repeat your new password"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {phase === 'done' && (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Password updated</CardTitle>
              <CardDescription>Redirecting you to sign in…</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your password has been updated successfully. You will be redirected shortly.
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  )
}
