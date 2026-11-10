import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import { PhoneIcon, RotateCcwIcon } from 'lucide-react'
import s from './night.module.css'

export const FOX = '/loqara-logo-colorful.webp'

export type HeaderStyle = 'curved' | 'classic' | 'floating'

/**
 * The Loqara widget's chrome, drawn to match components/widget/ChatWindow.tsx:
 * brand header (avatar, name, status, tool buttons), the body sheet, and the
 * "Powered by" line. `style` carries --w-accent / --w-radius for restyling.
 */
export function WidgetFrame({
  name = 'Demo store',
  header = 'curved',
  style,
  children,
}: {
  name?: string
  header?: HeaderStyle
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div className={s.pane} data-header={header} style={style}>
      <div className={s.paneHead}>
        <span className={s.avatar}>
          <Image src={FOX} alt="" fill sizes="32px" className="object-contain p-0.5" />
        </span>
        <div className={s.paneId}>
          <p className={s.paneName}>{name}</p>
          <p className={s.paneState}>
            <span className={s.live} aria-hidden="true" />
            Online
          </p>
        </div>
        <div className={s.paneTools} aria-hidden="true">
          <span>EN</span>
          <span>
            <PhoneIcon className="size-4" />
          </span>
          <span>
            <RotateCcwIcon className="size-4" />
          </span>
        </div>
      </div>
      <div className={s.paneBody}>
        {children}
        <p className={s.powered}>
          Powered by
          <Image src={FOX} alt="" width={12} height={12} className="size-3" />
          <b>Loqara</b>
        </p>
      </div>
    </div>
  )
}
