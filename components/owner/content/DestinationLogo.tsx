import type { IconType } from 'react-icons'
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa6'
import { Globe2Icon, type LucideIcon } from 'lucide-react'
import type { ContentPublicationProvider } from '@/lib/content-studio/types'
import { cn } from '@/lib/utils'

interface DestinationBrand {
  icon: LucideIcon | IconType
  /** App-icon style tile: solid (or gradient) brand background with a white glyph. */
  tile: string
  /** Single accent color for borders/washes; CSS color value. */
  accent: string
}

const DESTINATION_BRANDS: Record<ContentPublicationProvider, DestinationBrand> = {
  website: { icon: Globe2Icon, tile: 'bg-primary text-primary-foreground', accent: 'var(--primary)' },
  linkedin: { icon: FaLinkedin, tile: 'bg-[#0a66c2] text-white', accent: '#0a66c2' },
  facebook: { icon: FaFacebook, tile: 'bg-[#1877f2] text-white', accent: '#1877f2' },
  instagram: {
    icon: FaInstagram,
    tile: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white',
    accent: '#ee2a7b',
  },
  youtube: { icon: FaYoutube, tile: 'bg-[#ff0000] text-white', accent: '#ff0000' },
  tiktok: { icon: FaTiktok, tile: 'bg-black text-white dark:border dark:border-white/20', accent: '#fe2c55' },
}

export function getDestinationAccent(provider: ContentPublicationProvider): string {
  return DESTINATION_BRANDS[provider].accent
}

export function DestinationLogo({
  provider,
  className,
}: {
  provider: ContentPublicationProvider
  className?: string
}) {
  const brand = DESTINATION_BRANDS[provider]
  const Icon = brand.icon
  return (
    <span
      data-provider-logo={provider}
      className={cn('grid size-10 shrink-0 place-items-center rounded-lg shadow-sm', brand.tile, className)}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}
