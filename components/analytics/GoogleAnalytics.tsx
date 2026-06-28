'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

/**
 * Google Analytics 4 via the gtag.js snippet, loaded with `next/script`
 * (`afterInteractive`) so it never blocks first paint.
 *
 * Gated on `NEXT_PUBLIC_GA_ID` — when the measurement ID is absent (local dev,
 * previews where you haven't set it), this renders nothing, so analytics stay
 * out of non-production traffic. Set the var only in the Vercel *Production*
 * environment to avoid counting preview deploys.
 *
 * Never loads on `/embed/*`: that route is the embeddable widget rendered inside
 * customers' sites, where firing Loqara's analytics (and cookies) would be both
 * a privacy problem and noise in the reports.
 *
 * The ID (`G-XXXXXXXXXX`) is not a secret; it ships to the browser by design.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export function GoogleAnalytics() {
  const pathname = usePathname()

  if (!GA_ID || pathname?.startsWith('/embed')) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
