'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Two-phase page:
 *  1. Request phase  — user enters their email; we send a magic reset link.
 *  2. Recovery phase — the reset link puts a #access_token in the URL;
 *                      we detect AUTH_STATE_CHANGE -> PASSWORD_RECOVERY and
 *                      show the "choose new password" form.
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

  // Detect the PASSWORD_RECOVERY event that Supabase fires after the user
  // clicks the reset link. It arrives via onAuthStateChange.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPhase('recovery')
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // ── Phase 1: send request email ──────────────────────────────────────────
  async function handleRequestReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
    } else {
      setMessage('Check your email for a password reset link.')
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
