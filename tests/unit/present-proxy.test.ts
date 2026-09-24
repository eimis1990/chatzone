import { describe, expect, it } from 'vitest'
import {
  findSpriteUrls,
  presentProxyPrefix,
  presentSiteProxyUrl,
  PRESENT_NAV_MESSAGE_KEY,
  rewritePresentHtml,
} from '@/lib/demo/present-proxy'

const OPTIONS = {
  baseHref: 'https://www.karakara.lt/',
  proxyPrefix: 'https://www.loqara.com/api/present/site?bot=abc&path=',
}

describe('presentation backdrop proxy URLs', () => {
  it('identifies the backdrop by bot or token, never by target URL', () => {
    expect(presentSiteProxyUrl({ token: 'tok' }, '/produktai/')).toBe(
      '/api/present/site?token=tok&path=%2Fproduktai%2F',
    )
  })

  // An empty path means "the configured websiteUrl as-is", so a URL pointing at
  // a subpath (https://site.com/lt/) isn't collapsed to the bare origin.
  it('defaults to an empty path rather than "/"', () => {
    expect(presentSiteProxyUrl({ bot: 'abc' })).toBe('/api/present/site?bot=abc&path=')
  })

  it('builds an absolute in-frame prefix, since <base> points at the client site', () => {
    expect(presentProxyPrefix('https://www.loqara.com', { bot: 'abc' })).toBe(
      'https://www.loqara.com/api/present/site?bot=abc&path=',
    )
  })
})

describe('rewritePresentHtml', () => {
  it('injects <base> and the link handler just inside <head>', () => {
    const out = rewritePresentHtml('<html><head><title>x</title></head><body>b</body></html>', OPTIONS)

    expect(out).toContain('<base href="https://www.karakara.lt/">')
    expect(out.indexOf('<base href=')).toBeLessThan(out.indexOf('<title>'))
    expect(out).toContain('<title>x</title>')
    expect(out).toContain(OPTIONS.proxyPrefix)
  })

  it('still injects when the document has no <head>', () => {
    expect(rewritePresentHtml('<body>b</body>', OPTIONS)).toContain('<base href=')
  })

  it('drops a page <base> and meta CSP that would fight the injection', () => {
    const out = rewritePresentHtml(
      `<head><base href="https://other.test/"><meta http-equiv="Content-Security-Policy" content="script-src 'none'"></head>`,
      OPTIONS,
    )

    expect(out).not.toContain('https://other.test/')
    expect(out).not.toMatch(/http-equiv/i)
    expect(out.match(/<base /g)).toHaveLength(1)
  })

  // Self-navigation from the sandboxed frame's opaque origin is cross-site to
  // the browser, so SameSite=Lax auth cookies get stripped and the owner-gated
  // route 404s. Links must postMessage so the STAGE navigates the frame.
  it('navigates via postMessage to the app origin, never by self-navigation', () => {
    const out = rewritePresentHtml('<head></head>', OPTIONS)

    expect(out).toContain(`window.parent.postMessage({${PRESENT_NAV_MESSAGE_KEY}:`)
    // targetOrigin is the app origin from proxyPrefix, not '*'.
    expect(out).toContain('APP="https://www.loqara.com"')
    expect(out).toContain('},APP)')
  })

  // Without this shim the sandboxed frame's opaque origin makes document.cookie
  // throw, WooCommerce's bootstrap aborts, and the backdrop renders broken.
  it('installs the opaque-origin shim ahead of the page’s own scripts', () => {
    const out = rewritePresentHtml('<head><script src="/theme.js"></script></head>', OPTIONS)

    expect(out).toContain("Object.defineProperty(Document.prototype,'cookie'")
    expect(out.indexOf('Document.prototype')).toBeLessThan(out.indexOf('/theme.js'))
  })

  it('escapes < in injected script values so the block cannot be broken out of', () => {
    const out = rewritePresentHtml('<head></head>', {
      baseHref: 'https://www.karakara.lt/',
      proxyPrefix: 'https://www.loqara.com/x?a=</script><script>alert(1)</script>&path=',
    })

    expect(out).not.toContain('</script><script>alert(1)')
    expect(out).toContain('\\u003c/script>')
  })
})

describe('scroll-reveal pre-hidden content', () => {
  // Module scripts are CORS-fetched; a client origin without ACAO refuses them
  // from the opaque frame, so JS-driven reveals never fire and the stage is blank.
  it('shows content that inline styles hide for a JS reveal animation', () => {
    const out = rewritePresentHtml(
      '<html><head></head><body>' +
        '<h1 style="opacity:0;transform:translateY(20px)">Hero</h1>' +
        "<p style='color:red; opacity: 0; transform:scale(0.9)'>Text</p>" +
        '<img style="opacity:0.5;transform:none">' +
        '<noscript><iframe style="display:none;visibility:hidden"></iframe></noscript>' +
        '</body></html>',
      OPTIONS,
    )
    expect(out).toContain('<h1 style="opacity:1">Hero</h1>')
    expect(out).toContain("<p style='color:red;opacity:1'>Text</p>")
    expect(out).toContain('<img style="opacity:0.5;transform:none">')
    expect(out).toContain('style="display:none;visibility:hidden"')
  })
})

describe('SVG sprite inlining', () => {
  const SPRITE_HTML =
    '<head></head><body><svg><use xlink:href="https://www.karakara.lt/build/icons.svg#cart"/></svg>' +
    '<svg><use href="/build/icons.svg#email"/></svg>' +
    '<svg><use xlink:href="https://cdn.other.test/x.svg#z"/></svg></body>'

  it('collects only same-origin sprite files, deduplicated', () => {
    expect(findSpriteUrls(SPRITE_HTML, 'https://www.karakara.lt')).toEqual([
      'https://www.karakara.lt/build/icons.svg',
    ])
  })

  // An external <use> must be same-origin as the document, which an opaque
  // origin never is — so every icon vanishes unless the sprite is inlined.
  it('inlines the sprite and turns its refs into origin-free fragments', () => {
    const out = rewritePresentHtml(SPRITE_HTML, {
      ...OPTIONS,
      sprites: new Map([
        ['https://www.karakara.lt/build/icons.svg', '<svg><symbol id="cart"/></svg>'],
      ]),
    })

    expect(out).toContain('<symbol id="cart"/>')
    expect(out).toContain('<use xlink:href="#cart"/>')
    expect(out).toContain('<use href="#email"/>')
    // A sprite we could not fetch, and other origins, are left alone.
    expect(out).toContain('<use xlink:href="https://cdn.other.test/x.svg#z"/>')
  })

  it('leaves the document untouched when no sprite was fetched', () => {
    const out = rewritePresentHtml(SPRITE_HTML, OPTIONS)
    expect(out).toContain('<use xlink:href="https://www.karakara.lt/build/icons.svg#cart"/>')
  })
})
