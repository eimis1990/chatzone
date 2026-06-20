import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Marketing site URL used in "Powered by Chatzone" links. */
export const POWERED_BY_URL = 'https://chatzone.app'
