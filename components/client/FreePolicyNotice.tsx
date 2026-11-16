'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { recordFreePolicyNotice } from '@/lib/actions/free-policy-notice'

export function FreePolicyNotice({ effectiveAt }: { effectiveAt: string | null }) {
  const [deadline, setDeadline] = useState(effectiveAt)
  useEffect(() => {
    if (!effectiveAt) void recordFreePolicyNotice().then(setDeadline).catch(() => {})
  }, [effectiveAt])
  const date = deadline ? new Date(deadline).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'short' }) + ' UTC' : null
  return <aside aria-label="Free plan update" className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 md:m-6">
    <p className="font-semibold">Your Free plan is changing</p>
    <p className="mt-1">{date ? `From ${date},` : 'After your 30-day notice period,'} Free includes 50 conversations each UTC calendar month and basic activity statistics. Live handoff, live product search, order lookup, and detailed analytics will no longer be included. Until then, your existing Free allowance and access continue.</p>
    <p className="mt-2">Your saved settings, knowledge, and history stay safe. Basic includes 400 conversations, live handoff, product search, and full analytics for €49/month or €490/year. Order lookup is included in Starter and above. <Link className="font-medium underline" href="/app/subscription">Compare plans</Link></p>
  </aside>
}
