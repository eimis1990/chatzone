'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Heading } from '@/lib/blog'
import { XIcon, FacebookIcon, LinkedinIcon } from './social-icons'

interface Props {
  /** Post title — shown as the table-of-contents heading (matches the reference). */
  title: string
  headings: Heading[]
  /** Absolute URL of the post, for the share links. */
  url: string
}

export function ArticleAside({ title, headings, url }: Props) {
  const [active, setActive] = useState('')

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    if (headings.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      // Trigger a bit below the fixed nav, and treat the top ~third as "active".
      { rootMargin: '-120px 0px -66% 0px' },
    )
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [headings])

  const enc = encodeURIComponent
  const share = [
    { label: 'Share on X', href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`, Icon: XIcon },
    { label: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, Icon: FacebookIcon },
    { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, Icon: LinkedinIcon },
  ]

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-28 space-y-8">
        {headings.length > 0 && (
          <nav aria-label="On this page">
            <p className="mb-4 text-sm font-semibold text-gray-900">{title}</p>
            <ul className="space-y-3">
              {headings.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className={cn(
                      'block text-sm leading-snug transition-colors',
                      active === h.id
                        ? 'font-medium text-gray-900'
                        : 'text-gray-500 hover:text-gray-900',
                    )}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="border-t border-gray-200 pt-6">
          <p className="mb-3 text-sm font-semibold text-gray-900">Share this</p>
          <div className="flex items-center gap-2">
            {share.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                title={label}
                className="flex size-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
