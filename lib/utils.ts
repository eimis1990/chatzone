import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Marketing site URL used in "Powered by Loqara" links. */
export const POWERED_BY_URL = 'https://www.loqara.com'

/**
 * Returns near-black or white — whichever reads better on the given background
 * color. Used to keep widget text/icons legible on any client-chosen color.
 * Falls back to white for non-hex inputs.
 */
export function readableTextColor(bg: string): string {
  const hex = bg.trim().replace(/^#/, '')
  let r = 0
  let g = 0
  let b = 0
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  } else {
    return '#ffffff'
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111827' : '#ffffff'
}

/** True when a color is so light that solid fills/text on white would vanish. */
export function isLightColor(bg: string): boolean {
  return readableTextColor(bg) === '#111827'
}
