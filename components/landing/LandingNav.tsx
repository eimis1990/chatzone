'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MenuIcon, XIcon } from 'lucide-react'
import { GetStartedDialog } from './GetStartedDialog'
import { trackEvent } from '@/lib/analytics'

const LINKS = [
  { label: 'Showcase', href: '/#showcase' },
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/#faq' },
]

/** `solid` forces the light (dark-text) bar — for pages without a dark hero. */
export function LandingNav({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solidNav = solid || scrolled

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solidNav ? 'border-b border-black/5 bg-white/85 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link
          href="/"
          prefetch={false}
          className={`flex items-center gap-2.5 text-2xl font-bold ${solidNav ? 'text-gray-900' : 'text-white'}`}
        >
          {/* Colorful fox over the dark hero; black fox once the bar turns white. */}
          <span
            aria-hidden="true"
            className="inline-block size-12 shrink-0 bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${solidNav ? '/loqara-fox-black.webp' : '/loqara-logo-colorful.webp'})`,
            }}
          />
          <span>
            Loqara<span className="text-primary">.</span>
          </span>
        </Link>

        <div className={`hidden items-center gap-8 text-sm font-medium md:flex ${solidNav ? 'text-gray-700' : 'text-white/85'}`}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => trackEvent('nav_click', { target: l.label })}
              className="transition-opacity hover:opacity-70"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            onClick={() => trackEvent('signin_click', { location: 'nav' })}
            className={`rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-colors ${
              solidNav
                ? 'bg-[#101213] text-white hover:bg-black'
                : 'bg-white text-[#101213] hover:bg-white/90'
            }`}
          >
            Sign in
          </Link>
          <GetStartedDialog
            source="nav"
            triggerClassName="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className={`md:hidden ${solidNav ? 'text-gray-900' : 'text-white'}`}
        >
          {open ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-black/5 bg-white px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-700">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => {
                  setOpen(false)
                  trackEvent('nav_click', { target: l.label })
                }}
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => {
                setOpen(false)
                trackEvent('signin_click', { location: 'nav-mobile' })
              }}
              className="rounded-full bg-[#101213] px-4 py-2 text-center font-semibold text-white"
            >
              Sign in
            </Link>
            <GetStartedDialog
              source="nav"
              onOpen={() => setOpen(false)}
              triggerClassName="w-full rounded-full bg-primary px-4 py-2 text-center font-semibold text-white transition-colors hover:bg-primary-hover"
            />
          </div>
        </div>
      )}
    </header>
  )
}
