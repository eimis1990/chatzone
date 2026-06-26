'use client'

import { useState } from 'react'
import { CheckCircle2Icon } from 'lucide-react'

/**
 * Early-access email capture for the landing page (hero + final CTA). Posts to
 * /api/signup and shows an inline success state. Styled for dark sections.
 */
export function EmailCapture({ source }: { source: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (res.ok && data.ok) {
        setStatus('done')
      } else {
        setStatus('error')
        setError(data.error ?? 'Something went wrong.')
      }
    } catch {
      setStatus('error')
      setError('Network error — please try again.')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex max-w-md items-center gap-2 rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-medium text-white backdrop-blur-md">
        <CheckCircle2Icon className="size-4 flex-shrink-0 text-primary" />
        Thank you! We&apos;ve got your email — we&apos;ll contact you soon.
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your work email"
          aria-label="Work email"
          className="h-12 flex-1 rounded-full border border-white/10 bg-black/30 px-5 text-sm text-white backdrop-blur-md placeholder:text-white/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-[#101213] shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover disabled:opacity-70"
        >
          {status === 'loading' ? 'Joining…' : 'Get started'}
        </button>
      </form>
      {status === 'error' && <p className="mt-2 pl-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}
