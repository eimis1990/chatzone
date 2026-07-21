import Link from 'next/link'

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-[#101213] text-white">
      <div
        className="shell-grid pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-full"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-20 text-center">
        <div
          className="font-semibold leading-none tracking-tight"
          style={{ fontSize: 'clamp(3rem, 12vw, 10rem)' }}
        >
          Loqara<span className="text-primary">.</span>
        </div>
        <p className="mx-auto mt-6 max-w-md text-balance text-base text-white/55">
          The AI chat &amp; voice agent for modern stores. Answers, leads, orders, and handoff — in
          one widget.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-white/45">
          <span>© 2026 Loqara. All rights reserved.</span>
          <span aria-hidden="true" className="text-base font-bold text-white/30">
            •
          </span>
          <Link href="/blog" className="transition-colors hover:text-white">
            Blog
          </Link>
          <span aria-hidden="true" className="text-base font-bold text-white/30">
            •
          </span>
          <Link href="/about" className="transition-colors hover:text-white">
            About
          </Link>
          <span aria-hidden="true" className="text-base font-bold text-white/30">
            •
          </span>
          <Link href="/editorial-policy" className="transition-colors hover:text-white">
            Editorial policy
          </Link>
          <span aria-hidden="true" className="text-base font-bold text-white/30">
            •
          </span>
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
          <span aria-hidden="true" className="text-base font-bold text-white/30">
            •
          </span>
          <Link href="/terms" className="transition-colors hover:text-white">
            Terms of use
          </Link>
        </div>
      </div>
    </footer>
  )
}
