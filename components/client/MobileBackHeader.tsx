'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'

/**
 * Mobile-only back header for per-bot pages (Analytics, Conversations, …),
 * which have no sidebar to navigate away from on a phone. Returns to the
 * previous screen (Home or More), falling back to Home.
 */
export function MobileBackHeader({ label }: { label: string }) {
  const router = useRouter()
  return (
    <div className="sticky top-0 z-20 flex items-center gap-1 border-b bg-background/95 px-2 py-2 backdrop-blur md:hidden">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push('/app'))}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-5" />
        <span className="max-w-[70vw] truncate">{label}</span>
      </button>
    </div>
  )
}
