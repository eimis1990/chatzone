import { describe, it, expect } from 'vitest'
import { LAUNCHER_ICONS, LAUNCHER_CLOSE_ICONS, LAUNCHER_ICON_LABELS } from '@/lib/launcher-icons'
import { defaultBotConfig, botConfigSchema } from '@/lib/validation/schemas'

describe('launcher icons', () => {
  it('every icon key has SVG art, a label, and is accepted by the schema', () => {
    for (const [key, svg] of Object.entries(LAUNCHER_ICONS)) {
      expect(svg, `missing SVG for ${key}`).toContain('<svg')
      expect(LAUNCHER_ICON_LABELS[key as keyof typeof LAUNCHER_ICON_LABELS], `missing label for ${key}`).toBeTruthy()
      const cfg = defaultBotConfig('T')
      const parsed = botConfigSchema.safeParse({
        ...cfg,
        theme: { ...cfg.theme, launcherIcon: key, launcherCloseIcon: 'chevron-down' },
      })
      expect(parsed.success, `schema rejects launcherIcon "${key}"`).toBe(true)
    }
    for (const [key, svg] of Object.entries(LAUNCHER_CLOSE_ICONS)) {
      expect(svg, `missing close SVG for ${key}`).toContain('<svg')
    }
  })

  it('defaults to chat icon, x close, and 20px offsets', () => {
    const theme = defaultBotConfig('T').theme
    expect(theme.launcherIcon).toBe('chat')
    expect(theme.launcherCloseIcon).toBe('x')
    expect(theme.launcherBottomSpacing).toBe(20)
    expect(theme.launcherSideSpacing).toBe(20)
  })

  it('widget.js carries a synced copy of every icon key', async () => {
    const fs = await import('node:fs')
    const widget = fs.readFileSync('public/widget.js', 'utf8')
    for (const key of Object.keys(LAUNCHER_ICONS)) {
      const present = widget.includes(`'${key}':`) || widget.includes(`${key}:`)
      expect(present, `widget.js missing launcher icon "${key}"`).toBe(true)
    }
    for (const key of Object.keys(LAUNCHER_CLOSE_ICONS)) {
      const present = widget.includes(`'${key}':`) || widget.includes(`${key}:`)
      expect(present, `widget.js missing close icon "${key}"`).toBe(true)
    }
  })
})
