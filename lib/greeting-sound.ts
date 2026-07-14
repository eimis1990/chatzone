/**
 * Greeting-prompt notification sounds, synthesized with WebAudio — no audio
 * assets to load. Deliberately quiet (peaks ~0.1 gain).
 *
 * ⚠️ Synced COPY of the synth in public/widget.js (playGreetingSound) — the
 * loader is no-build vanilla JS and can't import this. Update both together.
 */
export type GreetingSound = 'none' | 'chime' | 'pop'

export const GREETING_SOUNDS: { value: GreetingSound; label: string }[] = [
  { value: 'none', label: 'No sound' },
  { value: 'chime', label: 'Soft chime' },
  { value: 'pop', label: 'Gentle pop' },
]

export function playGreetingSound(kind: GreetingSound): void {
  if (kind !== 'chime' && kind !== 'pop') return
  try {
    const ctx = new AudioContext()
    // Autoplay-blocked (no user gesture yet) — stay silent rather than queue.
    if (ctx.state === 'suspended') {
      void ctx.close()
      return
    }
    const note = (freq: number, at: number, dur: number, peak: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime + at)
      gain.gain.setValueAtTime(0, ctx.currentTime + at)
      gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + at + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + at)
      osc.stop(ctx.currentTime + at + dur + 0.05)
      return osc
    }
    if (kind === 'chime') {
      // Two-tone bell: C6 then G6, soft and short.
      note(1046.5, 0, 0.5, 0.1)
      note(1568, 0.13, 0.6, 0.08)
    } else {
      // Gentle "bloop": a quick upward pitch glide.
      const osc = note(440, 0, 0.25, 0.13)
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.07)
    }
    setTimeout(() => {
      void ctx.close().catch(() => {})
    }, 1200)
  } catch {
    // Audio unsupported/blocked — the greeting still shows, just silently.
  }
}
