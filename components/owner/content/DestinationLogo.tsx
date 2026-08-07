import type { IconType } from 'react-icons'
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa6'
import { Globe2Icon, type LucideIcon } from 'lucide-react'
import type { ContentPublicationProvider } from '@/lib/content-studio/types'
import { cn } from '@/lib/utils'

const DESTINATION_ICONS: Record<ContentPublicationProvider, LucideIcon | IconType> = {
  website: Globe2Icon,
  linkedin: FaLinkedin,
  facebook: FaFacebook,
  instagram: FaInstagram,
  youtube: FaYoutube,
  tiktok: FaTiktok,
}

export function DestinationLogo({
  provider,
  className,
}: {
  provider: ContentPublicationProvider
  className?: string
}) {
  const Icon = DESTINATION_ICONS[provider]
  return (
    <span
      data-provider-logo={provider}
      className={cn('grid size-10 shrink-0 place-items-center rounded-lg border bg-background', className)}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}
