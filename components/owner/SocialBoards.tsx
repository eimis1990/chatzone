'use client'

import { useState } from 'react'
import { CameraIcon, MessageCircleIcon } from 'lucide-react'
import { LinkedInBoard } from '@/components/owner/LinkedInBoard'
import { cn } from '@/lib/utils'
import type { SocialPlatform, SocialPost } from '@/lib/types'

export function SocialBoards({ initialPosts }: { initialPosts: SocialPost[] }) {
  const facebookPosts = initialPosts.filter((post) => post.platform === 'facebook')
  const instagramPosts = initialPosts.filter((post) => post.platform === 'instagram')
  const [platform, setPlatform] = useState<SocialPlatform>('facebook')
  const platformPosts = platform === 'facebook' ? facebookPosts : instagramPosts

  const platformSwitcher = (
    <div
      className="grid w-full shrink-0 grid-cols-2 gap-1 rounded-xl border bg-muted p-1"
      role="tablist"
      aria-label="Social platform"
    >
      {([
        { value: 'facebook', label: 'Facebook', count: facebookPosts.length, icon: MessageCircleIcon },
        { value: 'instagram', label: 'Instagram', count: instagramPosts.length, icon: CameraIcon },
      ] as const).map((tab) => {
        const active = platform === tab.value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-label={`${tab.label} (${tab.count})`}
            aria-selected={active}
            onClick={() => setPlatform(tab.value)}
            className={cn(
              'flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium transition-all sm:gap-2 sm:px-4',
              active
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{tab.label}</span>
            <span
              className={cn(
                'shrink-0 rounded px-1 py-0.5 text-xs font-semibold tabular-nums sm:px-1.5',
                active ? 'bg-primary/10 text-primary' : 'bg-foreground/10',
              )}
            >
              {tab.count}
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <LinkedInBoard
      key={platform}
      initialPosts={platformPosts}
      platform={platform}
      headerAddon={platformSwitcher}
    />
  )
}
