'use client'

import { useState } from 'react'
import { KeyRoundIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { SectionCard } from '@/components/client/SectionCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <SectionCard
      icon={KeyRoundIcon}
      title="Password"
      description="Change the password you use to sign in to Loqara."
      contentClassName="space-y-4"
    >
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4">
        {/* Helps password managers attach the change to the right account. */}
        <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={busy}
            aria-invalid={tooShort || undefined}
          />
          <p className="text-xs text-muted-foreground">At least {MIN_LENGTH} characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
            aria-invalid={mismatch || undefined}
          />
          {mismatch && <p className="text-xs text-destructive">The two passwords don’t match.</p>}
        </div>
        <Button type="submit" disabled={!ready} className="h-10 self-start px-5">
          {busy && <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />}
          Change password
        </Button>
      </form>
    </SectionCard>
  )
}
