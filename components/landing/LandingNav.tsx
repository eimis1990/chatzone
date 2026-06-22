'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BotIcon, MenuIcon, XIcon } from 'lucide-react'

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing', href: '#pricing' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-black/5 bg-white/85 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className={`flex items-center gap-2 font-semibold ${scrolled ? 'text-gray-900' : 'text-white'}`}>
          <BotIcon className="size-5 text-[#68A369]" />
          <span>Chatzone</span>
        </Link>

        <div className={`hidden items-center gap-8 text-sm font-medium md:flex ${scrolled ? 'text-gray-700' : 'text-white/85'}`}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-opacity hover:opacity-70">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={`text-sm font-medium transition-opacity hover:opacity-70 ${scrolled ? 'text-gray-700' : 'text-white/85'}`}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-[#68A369] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a9159]"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className={`md:hidden ${scrolled ? 'text-gray-900' : 'text-white'}`}
        >
          {open ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-black/5 bg-white px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-700">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-full bg-[#68A369] px-4 py-2 text-center font-semibold text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
