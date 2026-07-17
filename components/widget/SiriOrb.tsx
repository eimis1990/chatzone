'use client'

/**
 * SiriOrb — a particle sphere shown while a live voice call is active.
 *
 * ~900 dots on a fibonacci sphere, orthographically projected and spun on a
 * plain 2D canvas: a dim dotted globe with a vivid, turbulent rim in brand
 * shades (light tint at the top → deep shade at the bottom). `activity`
 * (0 calm … 1 active) drives spin speed, rim scatter and glow — the host maps
 * it from the call state, so the orb settles while the visitor talks and
 * comes alive while the agent speaks.
 *
 * Canvas 2D only — earlier CSS-filter versions rendered differently across
 * browsers; dots + transforms render identically everywhere.
 */

import { useEffect, useRef } from 'react'

export interface SiriOrbProps {
  /** Rendered square size in px. */
  size?: number
  /** Brand color (hex) — the whole palette derives from it. */
  color?: string
  /** Dark chat body — dims the interior toward black instead of white. */
  dark?: boolean
  /** 0 = calm (visitor talking / listening) … 1 = active (agent speaking). */
  activity?: number
}

type RGB = [number, number, number]

function hexRgb(input: string): RGB {
  const hex = input.trim().replace(/^#/, '')
  if (hex.length === 3) {
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)]
  }
  if (hex.length === 6) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
  }
  return [99, 102, 241] // indigo fallback for non-hex inputs
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

const PARTICLES = 900

export function SiriOrb({ size = 88, color = '#6366f1', dark = false, activity = 0.4 }: SiriOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Live-updated without restarting the render loop.
  const activityRef = useRef(activity)
  activityRef.current = activity

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = size * dpr
    canvas.width = px
    canvas.height = px
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Palette — all shades of the brand color.
    const brand = hexRgb(color)
    const white: RGB = [255, 255, 255]
    const black: RGB = [8, 8, 12]
    const rimLight = mix(brand, white, 0.55) // top of the rim
    const rimDeep = mix(brand, black, 0.2) // bottom of the rim
    // The dim dotted globe inside the rim — must contrast with the body:
    // deep brand dust on light bodies, soft brand dust on dark ones.
    const interior = dark ? mix(brand, white, 0.12) : mix(brand, black, 0.35)

    // Fibonacci sphere + per-particle noise phases (client-only, no SSR).
    const golden = Math.PI * (3 - Math.sqrt(5))
    const pts = Array.from({ length: PARTICLES }, (_, i) => {
      const y = 1 - (i / (PARTICLES - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const th = golden * i
      return {
        x: Math.cos(th) * r,
        y,
        z: Math.sin(th) * r,
        p1: Math.random() * Math.PI * 2,
        p2: Math.random() * Math.PI * 2,
        f: 0.6 + Math.random() * 1.1,
      }
    })

    const c = px / 2
    const baseR = px * 0.36
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let level = activityRef.current
    let rotY = Math.random() * Math.PI * 2
    let raf = 0
    let last = performance.now()

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      // Ease toward the target state so speaking→listening feels organic.
      level += (activityRef.current - level) * Math.min(dt * 2.5, 1)
      rotY += dt * (0.12 + level * 0.55)
      const rotX = Math.sin(now * 0.00025) * 0.35
      // NOTE: never scale this clock by `level` — multiplying ABSOLUTE time by
      // a changing factor makes every particle's phase leap when the state
      // eases, which reads as sudden wild spinning. Activity affects only the
      // displacement amplitude below (particles spread further, same tempo).
      const t = now * 0.001
      const cosY = Math.cos(rotY)
      const sinY = Math.sin(rotY)
      const cosX = Math.cos(rotX)
      const sinX = Math.sin(rotX)

      ctx.clearRect(0, 0, px, px)
      for (const p of pts) {
        const x1 = p.x * cosY + p.z * sinY
        const z1 = -p.x * sinY + p.z * cosY
        const y1 = p.y * cosX - z1 * sinX
        const z2 = p.y * sinX + z1 * cosX

        // Silhouette proximity (z≈0 = on the visible edge) → the vivid rim.
        const rim = 1 - Math.abs(z2)
        const rimW = rim ** 2.4
        // Cheap organic turbulence, strongest on the rim and when active.
        const noise = Math.sin(t * p.f * 2.1 + p.p1) * Math.sin(t * p.f * 1.3 + p.p2)
        const disp = 1 + noise * (0.02 + level * 0.17) * (0.3 + rimW)

        const sx = c + x1 * baseR * disp
        const sy = c + y1 * baseR * disp
        // Rim color runs light (top) → deep (bottom); interior stays dim.
        const rimColor = mix(rimLight, rimDeep, (y1 + 1) / 2)
        const col = mix(interior, rimColor, rimW)
        // Interior dust stays visible; back-face dots fade for depth.
        const alpha = Math.min(0.3 + rimW * (0.45 + level * 0.3) + (z2 > 0 ? 0.08 : -0.1), 1)
        const dotR = (px / 176) * (1.05 + rimW * (1.3 + level * 0.8))

        ctx.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(sx, sy, dotR, 0, 6.2832)
        ctx.fill()
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size, color, dark])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
    />
  )
}
