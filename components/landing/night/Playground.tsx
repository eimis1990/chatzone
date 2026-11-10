'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import {
  ArrowDownIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  MicIcon,
  SendHorizontalIcon,
  SquareIcon,
  Volume2Icon,
} from 'lucide-react'
import { fontStack } from '@/lib/fonts'
import { FOX, WidgetFrame, type HeaderStyle } from './WidgetFrame'
import s from './night.module.css'

type Lang = 'en' | 'lt'
type QuickStyle = 'tiles' | 'pills' | 'list'

const COLOURS = [
  { name: 'Loqara orange', hex: '#e97634' },
  { name: 'Forest', hex: '#2f7d5b' },
  { name: 'Ocean', hex: '#2563eb' },
  { name: 'Plum', hex: '#7c3aed' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Ink', hex: '#14182b' },
]

// What the widget says, per visitor language. GREETING is also what the
// recordings in public/landing/greeting-<lang>.mp3 speak: change one, re-run
// scripts/gen-landing-greeting.mjs.
const COPY = {
  en: {
    name: 'Your store',
    role: 'Virtual assistant',
    greeting: 'Hi! I’m your store’s assistant. Ask me about products, orders or delivery.',
    hear: 'Hear the voice greeting',
    stop: 'Stop',
    quick: ['How long is delivery?', 'Can I return an item?', 'Where is my order?', 'Talk to a person'],
    placeholder: 'Type a message…',
    launcher: 'Chat with us',
  },
  lt: {
    name: 'Jūsų parduotuvė',
    role: 'Virtualus asistentas',
    greeting: 'Sveiki! Aš jūsų parduotuvės asistentas. Klauskite apie prekes, užsakymus ar pristatymą.',
    hear: 'Išgirsti balso pasisveikinimą',
    stop: 'Sustabdyti',
    quick: ['Kiek trunka pristatymas?', 'Ar galiu grąžinti prekę?', 'Kur mano užsakymas?', 'Pasikalbėti su žmogumi'],
    placeholder: 'Rašykite žinutę…',
    launcher: 'Parašykite mums',
  },
} as const

function Choice<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { label: string; value: T }[]
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

/** A titled group of settings rows in the panel. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={s.group}>
      <p className={s.groupTitle}>{title}</p>
      {children}
    </div>
  )
}

/**
 * The widget at its real size, restyled live with a sample of what the
 * configurator sets: colour, corners, header, chat background, font, the
 * suggested-question layout, launcher and visitor language. The play button
 * speaks the greeting in the selected language (a recording; voice is an
 * add-on). Everything is CSS variables and data attributes on the same frame
 * the hero uses.
 */
export function Playground() {
  const [accent, setAccent] = useState(COLOURS[0].hex)
  const [radius, setRadius] = useState(1)
  const [header, setHeader] = useState<HeaderStyle>('curved')
  const [dark, setDark] = useState(false)
  const [font, setFont] = useState('geist')
  const [quick, setQuick] = useState<QuickStyle>('tiles')
  const [launcher, setLauncher] = useState<'circle' | 'pill'>('circle')
  const [lang, setLang] = useState<Lang>('en')
  const [speaking, setSpeaking] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)

  const c = COPY[lang]
  const theme = {
    '--w-accent': accent,
    '--w-radius': `${radius}rem`,
    '--w-font': fontStack(font),
  } as CSSProperties

  const stop = () => {
    audio.current?.pause()
    audio.current = null
    setSpeaking(false)
  }
  const speak = () => {
    stop()
    const clip = new Audio(`/landing/greeting-${lang}.mp3`)
    clip.onended = stop
    audio.current = clip
    setSpeaking(true)
    clip.play().catch(stop)
  }
  // A greeting in the old language must not keep talking over the new one.
  const pickLang = (next: Lang) => {
    stop()
    setLang(next)
  }
  const reset = () => {
    stop()
    setAccent(COLOURS[0].hex)
    setRadius(1)
    setHeader('curved')
    setDark(false)
    setFont('geist')
    setQuick('tiles')
    setLauncher('circle')
    setLang('en')
  }
  useEffect(() => () => audio.current?.pause(), [])

  const QuickIcon = quick === 'list' ? ChevronRightIcon : ArrowDownIcon

  return (
    <section id="showcase" className={s.day} data-clock="600" data-tone="day">
      <div className={s.play}>
        <div className={s.playHead}>
          <h2 className={s.h2}>A widget that fits your brand</h2>
          <p className={s.sub}>
            This is the widget at its real size. Change it here, switch its language, and press
            play to hear its greeting. The editor has many more settings, including 24 fonts,
            and we build custom designs on request.
          </p>
        </div>

        <div className={`${s.preview} ${s.rise}`} style={theme} data-testid="playground-preview">
          <WidgetFrame name={c.name} header={header} lang={lang} dark={dark} style={theme}>
            <div className={s.welcome} lang={lang}>
              <div className={s.welcomeWho}>
                <span className={s.welcomeFace}>
                  <Image src={FOX} alt="" fill sizes="64px" className="object-contain p-1.5" />
                </span>
                <p className={s.welcomeName}>{c.name}</p>
                <p className={s.welcomeRole}>{c.role}</p>
              </div>
              <p className={`${s.bubble} ${s.fromAgent}`}>{c.greeting}</p>
              <button
                type="button"
                className={s.hear}
                aria-pressed={speaking}
                onClick={speaking ? stop : speak}
              >
                {speaking ? (
                  <>
                    <span className={s.bars} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    <SquareIcon className="size-3 fill-current" aria-hidden="true" />
                    {c.stop}
                  </>
                ) : (
                  <>
                    <Volume2Icon className="size-4" aria-hidden="true" />
                    {c.hear}
                  </>
                )}
              </button>
              <div className={s.quick} data-style={quick} aria-hidden="true">
                {c.quick.map((q) => (
                  <span key={q}>
                    {q}
                    <QuickIcon className="size-4" />
                  </span>
                ))}
              </div>
            </div>
            <div className={s.composer} aria-hidden="true">
              <span className={s.field}>
                <span style={{ color: 'var(--w-muted)' }}>{c.placeholder}</span>
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
            <span>{c.launcher}</span>
          </span>
        </div>

        <div className={s.panel}>
          <p className={s.panelHead}>
            Customise
            <button type="button" onClick={reset}>
              Reset
            </button>
          </p>

          <Group title="Look">
            <div className={s.control}>
              <span className={s.controlLabel} id="playground-colour">
                Colour
              </span>
              <div className={s.swatches} role="radiogroup" aria-labelledby="playground-colour">
                {COLOURS.map((colour) => (
                  <button
                    key={colour.hex}
                    type="button"
                    role="radio"
                    aria-checked={colour.hex === accent}
                    aria-label={colour.name}
                    className={s.swatch}
                    style={{ backgroundColor: colour.hex }}
                    onClick={() => setAccent(colour.hex)}
                  />
                ))}
                <label className={s.anyColour} title="Any colour">
                  <span className="sr-only">Any colour</span>
                  <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
                </label>
              </div>
            </div>
            <Choice
              label="Background"
              options={[
                { label: 'Light', value: false },
                { label: 'Dark', value: true },
              ]}
              value={dark}
              onChange={setDark}
            />
            <Choice
              label="Font"
              options={[
                { label: 'Geist', value: 'geist' },
                { label: 'Fredoka', value: 'fredoka' },
                { label: 'Playfair', value: 'playfair' },
              ]}
              value={font}
              onChange={setFont}
            />
            <Choice
              label="Corners"
              options={[
                { label: 'Sharp', value: 0.375 },
                { label: 'Soft', value: 1 },
                { label: 'Round', value: 1.375 },
              ]}
              value={radius}
              onChange={setRadius}
            />
          </Group>

          <Group title="Layout">
            <Choice
              label="Header"
              options={[
                { label: 'Curved', value: 'curved' },
                { label: 'Classic', value: 'classic' },
                { label: 'Floating', value: 'floating' },
              ]}
              value={header}
              onChange={setHeader}
            />
            <Choice
              label="Suggested questions"
              options={[
                { label: 'Tiles', value: 'tiles' },
                { label: 'Pills', value: 'pills' },
                { label: 'List', value: 'list' },
              ]}
              value={quick}
              onChange={setQuick}
            />
            <Choice
              label="Launcher"
              options={[
                { label: 'Circle', value: 'circle' },
                { label: 'Pill', value: 'pill' },
              ]}
              value={launcher}
              onChange={setLauncher}
            />
          </Group>

          <Group title="Language and voice">
            <Choice
              label="Language"
              options={[
                { label: 'English', value: 'en' },
                { label: 'Lietuvių', value: 'lt' },
              ]}
              value={lang}
              onChange={pickLang}
            />
            <div className={s.control}>
              <span className={s.controlLabel}>Voice greeting</span>
              <button
                type="button"
                className={s.hear}
                aria-pressed={speaking}
                onClick={speaking ? stop : speak}
              >
                {speaking ? (
                  <>
                    <span className={s.bars} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    Stop
                  </>
                ) : (
                  <>
                    <Volume2Icon className="size-4" aria-hidden="true" />
                    Play in {lang === 'lt' ? 'Lithuanian' : 'English'}
                  </>
                )}
              </button>
            </div>
          </Group>
        </div>
      </div>
    </section>
  )
}
