// Real-timing screenshots of the landing page, for checking visual changes.
// Headless Chromium with the GPU on (ANGLE/Metal, macOS), so the WebGL sky
// renders and CSS animations run at real speed; the in-app Browser pane does
// neither reliably when hidden. Needs the dev server on :3000.
// Usage: node scripts/landing-shots.mjs <outDir> [width height]
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('@playwright/test')

const out = process.argv[2]
const width = Number(process.argv[3] ?? 1440)
const height = Number(process.argv[4] ?? 810)
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width, height } })
await page.goto('http://localhost:3000/', { waitUntil: 'load' })
await page.waitForTimeout(6000)
const info = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const gl = document.createElement('canvas').getContext('webgl')
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info')
  return { skyOn: c?.hasAttribute('data-on'), renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null }
})
console.log(JSON.stringify(info))
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` })
await shot('1-hero')
await page.evaluate(() => window.scrollTo({ top: 380, behavior: 'instant' }))
await page.waitForTimeout(700)
await shot('2-hero-scrolled')
const go = async (sel, p, off = 0) => {
  await page.evaluate(([sel, p, off]) => {
    const el = document.querySelector(sel)
    const r = el.getBoundingClientRect()
    const pin = Math.max(r.height - innerHeight, 0)
    window.scrollTo({ top: r.top + scrollY + pin * p + off, behavior: 'instant' })
  }, [sel, p, off])
  await page.waitForTimeout(900)
}
await go('#features', 0.55); await shot('3-order-mid')
await go('[data-clock="1607"]', 0, -120); await shot('4-tonight')
await go('[data-clock="1607"]', 0, 330); await shot('5-tonight-footer')
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
await page.waitForTimeout(900); await shot('6-footer')
await browser.close()
