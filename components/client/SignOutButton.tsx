'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { LogOutIcon } from 'lucide-react'

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      aria-label="Sign out"
      title={compact ? 'Sign out' : undefined}
      className={compact
        ? 'size-11 justify-center rounded-xl p-0 text-white/70 hover:bg-white/10 hover:text-white'
        : 'w-full justify-start text-white/80 hover:bg-white/10 hover:text-white'}
    >
      <LogOutIcon />
      <span className={compact ? 'sr-only' : undefined}>Sign out</span>
    </Button>
  )
}
