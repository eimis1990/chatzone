'use client'

import { useState } from 'react'
import { KeyRoundIcon, ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { createBrowserClient } from '@/lib/supabase/browser'

/** Matches Supabase Auth's minimum; the server enforces it regardless. */
const MIN_LENGTH = 8

/**
 * Change the signed-in user's password from Settings.
 *
 * The current password is verified first with a throwaway sign-in
 * (`signInWithPassword` against the same email): Supabase's `updateUser` alone
 * would let anyone who walks up to an unlocked, already-signed-in browser take
 * the account over. That call refreshes the same session rather than creating
 * a second one, so a wrong current password fails without disturbing anything.
 */
export function ChangePasswordCard({ email }: { email: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const tooShort = next.length > 0 && next.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && next !== confirm
  const ready = current.length > 0 && next.length >= MIN_LENGTH && next === confirm && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    const supabase = createBrowserClient()
    try {
      const { error: wrongCurrent } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      })
      if (wrongCurrent) {
        toast.error('That current password is not right.')
        return
      }
      const { error: updateFailed } = await supabase.auth.updateUser({ password: next })
      if (updateFailed) {
        toast.error(updateFailed.message)
        return
      }
      toast.success('Password changed.')
      setCurrent('')
      setNext('')
      setConfirm('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Password</CardTitle>
              <CardDescription className="mt-0.5">
                Update the password for <span className="font-medium text-foreground">{email}</span>.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Alert className="max-w-xl">
            <ShieldCheckIcon aria-hidden="true" />
            <AlertTitle>Keep your account secure</AlertTitle>
            <AlertDescription>
              Use a unique password you do not reuse on another service. Your current password is
              verified before any change is applied.
            </AlertDescription>
          </Alert>
          {/* Helps password managers attach the change to the right account. */}
          <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
          <FieldGroup className="max-w-xl">
            <Field data-disabled={busy || undefined}>
              <FieldLabel htmlFor="current-password">Current password</FieldLabel>
              <Input
                id="current-password"
                className="h-11"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                disabled={busy}
              />
            </Field>
            <Field data-invalid={tooShort || undefined} data-disabled={busy || undefined}>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                id="new-password"
                className="h-11"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
                disabled={busy}
                aria-invalid={tooShort || undefined}
              />
              {tooShort ? (
                <FieldError>Use at least {MIN_LENGTH} characters.</FieldError>
              ) : (
                <FieldDescription>At least {MIN_LENGTH} characters.</FieldDescription>
              )}
            </Field>
            <Field data-invalid={mismatch || undefined} data-disabled={busy || undefined}>
              <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
              <Input
                id="confirm-password"
                className="h-11"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                disabled={busy}
                aria-invalid={mismatch || undefined}
              />
              {mismatch && <FieldError>The two passwords don&apos;t match.</FieldError>}
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={!ready} className="h-11">
            {busy && <Spinner data-icon="inline-start" />}
            Change password
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
