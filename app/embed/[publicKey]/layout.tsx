import type { ReactNode } from 'react'

/**
 * Minimal layout for the embedded chat iframe.
 * Overrides the root app layout — no nav, no theme wrapper, just full-height body.
 */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
          #embed-root { height: 100%; }
        `}</style>
      </head>
      <body>
        <div id="embed-root">{children}</div>
      </body>
    </html>
  )
}
