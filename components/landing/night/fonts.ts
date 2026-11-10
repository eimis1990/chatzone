import { Bricolage_Grotesque } from 'next/font/google'

/**
 * Display face for the night landing: headlines and the scene clock. Geist
 * stays the body/UI face, so the demo conversations read like the real widget.
 * latin-ext carries the Lithuanian scene.
 */
export const display = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz', 'wdth'],
  display: 'swap',
  variable: '--font-night',
})
