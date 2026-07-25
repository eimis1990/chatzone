import type { Metadata } from 'next'
import { Archivo, Archivo_Black, Martian_Mono, Schibsted_Grotesk } from 'next/font/google'
import { VersionTabs } from '@/components/preview/VersionTabs'

/**
 * Route group for the two landing-redesign candidates (/v1, /v2). Never
 * indexed — these are internal review surfaces, not public pages, and the live
 * landing at `/` stays untouched.
 *
 * Both worlds' faces load here rather than in the root layout so the public
 * site pays nothing for them.
 */
const archivo = Archivo({
  variable: '--font-studio-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})
const archivoBlack = Archivo_Black({
  variable: '--font-studio-display',
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
})
const martianMono = Martian_Mono({
  variable: '--font-studio-mono',
  subsets: ['latin'],
  display: 'swap',
})
const schibsted = Schibsted_Grotesk({
  variable: '--font-glass-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${archivo.variable} ${archivoBlack.variable} ${martianMono.variable} ${schibsted.variable}`}
    >
      <VersionTabs />
      {children}
    </div>
  )
}
