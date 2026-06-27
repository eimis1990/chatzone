'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { resolveHome } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shimmer } from '@/components/landing/Shimmer'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sign-in succeeded but no session was found. Please try again.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: UserRole }>()

    const role: UserRole = profile?.role ?? 'client'
    router.push(resolveHome(role))
    router.refresh()
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4">
      {/* Strongly-blurred hero behind the card (scaled up so blurred edges stay off-screen) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-2xl"
        style={{ backgroundImage: "url('/loqara-hero-1.png')" }}
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/15" />

      <Card className="w-full max-w-md border-white/40 bg-white/60 shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription className="text-foreground/60">
            Enter your email and password to access Loqara.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                className="bg-white/70"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a
                  href="/reset-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="bg-white/70"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={!canSubmit}
              className="relative h-12 w-full overflow-hidden text-base shadow-lg shadow-primary/20"
            >
              <span className="relative z-10">{loading ? 'Signing in…' : 'Sign in'}</span>
              {canSubmit && <Shimmer />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
