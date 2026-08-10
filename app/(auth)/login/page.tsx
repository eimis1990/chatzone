'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRightIcon } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { resolveHome } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DotPattern } from '@/components/ui/dot-pattern'

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
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient dot grid behind the card, faded out toward the edges. */}
      <DotPattern className="[mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />

      {/* Brand lockup — same black fox + wordmark as the landing nav. */}
      <Link
        href="/"
        prefetch={false}
        className="absolute left-6 top-6 z-10 flex items-center gap-2 text-2xl font-bold text-gray-900"
      >
        <span
          aria-hidden="true"
          className="inline-block size-11 shrink-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/loqara-fox-black.webp)' }}
        />
        <span>
          Loqara<span className="text-primary">.</span>
        </span>
      </Link>

      <Card className="relative z-10 w-full max-w-md rounded-3xl border bg-card px-2 py-6 shadow-xs ring-0">
        <CardHeader className="space-y-1.5 pb-2">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>Enter your email and password to access Loqara.</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
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
                className="bg-white"
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
                className="bg-white"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            {/* Same sliding-tray treatment as the configurator's Save & Publish. */}
            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit}
              className="group relative h-12 w-full overflow-hidden rounded-xl bg-[#101213] px-4 text-base text-white hover:bg-[#101213]/90"
            >
              <span className="mr-9 transition-opacity duration-500 group-hover:opacity-0">
                {loading ? 'Signing in…' : 'Sign in'}
              </span>
              <i
                aria-hidden="true"
                className="absolute bottom-1 right-1 top-1 z-10 grid w-10 place-items-center rounded-lg bg-white/15 transition-all duration-500 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95"
              >
                <ArrowRightIcon className="size-4" strokeWidth={2} />
              </i>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
