'use client'

import { useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { MessageCircleIcon, MicIcon, SendHorizontalIcon } from 'lucide-react'
import { FOX, WidgetFrame, type HeaderStyle } from './WidgetFrame'
import s from './night.module.css'

const COLOURS = [
  { name: 'Loqara orange', hex: '#e97634' },
  { name: 'Forest', hex: '#2f7d5b' },
  { name: 'Ocean', hex: '#2563eb' },
  { name: 'Plum', hex: '#7c3aed' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Ink', hex: '#14182b' },
]
const CORNERS = [
  { label: 'Sharp', rem: 0.375 },
  { label: 'Soft', rem: 1 },
  { label: 'Round', rem: 1.375 },
]
const HEADERS: { label: string; id: HeaderStyle }[] = [
  { label: 'Curved', id: 'curved' },
  { label: 'Classic', id: 'classic' },
  { label: 'Floating', id: 'floating' },
]
const LAUNCHERS = [
  { label: 'Circle', id: 'circle' },
  { label: 'Pill', id: 'pill' },
] as const

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { label: string; value: T }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className={s.control}>
      <span className={s.controlLabel}>{label}</span>
      <div className={s.segDay} role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * The widget, restyled live: the same four things a store owner sets in the
 * configurator (colour, corners, header style, launcher), applied as CSS
 * variables to the same frame the hero uses.
 */
export function Playground() {
  const [accent, setAccent] = useState(COLOURS[0].hex)
  const [radius, setRadius] = useState(1)
  const [header, setHeader] = useState<HeaderStyle>('curved')
  const [launcher, setLauncher] = useState<(typeof LAUNCHERS)[number]['id']>('circle')
  const theme = { '--w-accent': accent, '--w-radius': `${radius}rem` } as CSSProperties

  return (
    <section id="showcase" className={s.day} data-clock="600" data-tone="day">
      <div className={s.split}>
        <div>
          <h2 className={s.h2}>A widget that fits your brand</h2>
          <p className={s.sub}>
            Colour, corners, header and launcher are yours to set, and what you see in the preview
            is what your customers get. Try it. For anything further from the template, we build
            custom designs on request.
          </p>

          <div className={s.controls}>
            <div className={s.control}>
              <span className={s.controlLabel} id="playground-colour">
                Colour
              </span>
              <div className={s.swatches} role="radiogroup" aria-labelledby="playground-colour">
                {COLOURS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    role="radio"
                    aria-checked={c.hex === accent}
                    aria-label={c.name}
                    className={s.swatch}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setAccent(c.hex)}
                  />
                ))}
              </div>
            </div>
            <Segmented
              label="Corners"
              options={CORNERS.map((c) => ({ label: c.label, value: c.rem }))}
              value={radius}
              onChange={setRadius}
            />
            <Segmented
              label="Header"
              options={HEADERS.map((h) => ({ label: h.label, value: h.id }))}
              value={header}
              onChange={setHeader}
            />
            <Segmented
              label="Launcher"
              options={LAUNCHERS.map((l) => ({ label: l.label, value: l.id }))}
              value={launcher}
              onChange={setLauncher}
            />
          </div>

        </div>

        <div className={`${s.preview} ${s.rise}`} style={theme} data-testid="playground-preview">
          <WidgetFrame name="Your store" header={header} style={theme}>
            <div className={s.thread} data-on="">
              <div className={s.botRow}>
                <span className={s.botAvatar}>
                  <Image src={FOX} alt="" fill sizes="28px" className="object-contain p-0.5" />
                </span>
                <div className={s.turn}>
                  <p className={`${s.bubble} ${s.fromAgent}`}>
                    Hi! Ask me about products, orders or delivery.
                  </p>
                </div>
              </div>
              <p className={`${s.bubble} ${s.fromCustomer}`}>Do you deliver to Riga?</p>
              <div className={s.botRow}>
                <span className={s.botAvatar}>
                  <Image src={FOX} alt="" fill sizes="28px" className="object-contain p-0.5" />
                </span>
                <div className={s.turn}>
                  <p className={`${s.bubble} ${s.fromAgent}`}>
                    We do. Furniture reaches Latvia in 3 to 5 working days.
                  </p>
                </div>
              </div>
            </div>
            <div className={s.chips} aria-hidden="true">
              <span className={s.chip} data-on="">
                Delivery
              </span>
              <span className={s.chip}>Returns</span>
              <span className={s.chip}>My order</span>
            </div>
            <div className={s.composer} aria-hidden="true">
              <span className={s.field}>
                <span className="text-[#9ca3af]">Type a message…</span>
              </span>
              <span className={s.micBtn}>
                <MicIcon className="size-4" />
              </span>
              <span className={s.sendBtn}>
                <SendHorizontalIcon className="size-4" />
              </span>
            </div>
          </WidgetFrame>
          <span className={s.launcher} data-shape={launcher} aria-hidden="true">
            <MessageCircleIcon className="size-6" />
            <span>Chat with us</span>
          </span>
        </div>
      </div>
    </section>
  )
}
