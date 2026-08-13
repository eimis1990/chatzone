/**
 * Presentation backdrop proxy — URL shape and HTML rewriting.
 *
 * Client sites almost always send `X-Frame-Options`, so the pitch stage cannot
 * iframe them directly. `/api/present/site` re-serves the page from our own
 * origin (without the framing headers), which makes the backdrop a real,
 * scrollable page instead of a screenshot. These helpers are pure so the
 * rewrite is unit-testable; the fetching and authorization live in the route.
 *
 * The proxied document is framed with `sandbox="allow-scripts"` (no
 * `allow-same-origin`), so it runs on an opaque origin and cannot touch our
 * cookies or storage. See `components/demo/DemoPresentationStage.tsx`.
 */

export const PRESENT_PROXY_PATH = '/api/present/site'

/**
 * A self-identifying bot UA gets 403s from the CDNs in front of client sites
 * (Hostinger's does exactly that), which would leave a perfectly proxyable site
 * on the fallback screenshot. Shared so the stage's reachability probe and the
 * proxy's own fetch cannot disagree about what they can reach.
 */
export const PRESENT_FETCH_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

/** How the proxy is authorized: an owner session + bot id, or a share token. */
export type PresentRef = { bot: string } | { token: string }

/**
 * Same-origin URL that renders the bot's backdrop site. The target URL itself
 * is never a parameter — the route derives it from the bot's config, so this
 * can never be used as an open proxy. An empty `path` means "the configured URL
 * as-is", which preserves a `websiteUrl` that points at a subpath.
 */
export function presentSiteProxyUrl(ref: PresentRef, path = ''): string {
  const params = new URLSearchParams('bot' in ref ? { bot: ref.bot } : { token: ref.token })
  params.set('path', path)
  return `${PRESENT_PROXY_PATH}?${params.toString()}`
}

/** `?bot=…&path=` prefix the in-page click handler appends an encoded path to. */
export function presentProxyPrefix(origin: string, ref: PresentRef): string {
  return new URL(presentSiteProxyUrl(ref, ''), origin).toString()
}

/** Safe to embed inside a <script> block in an HTML document. */
function jsString(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/** Message shape the in-frame handler posts to the stage for navigation. */
export const PRESENT_NAV_MESSAGE_KEY = '__loqaraPresentNav'

/**
 * In-frame click handler: keep same-origin navigation inside the proxy instead
 * of letting the frame navigate to the real site (which would then be blocked
 * by its own X-Frame-Options and go blank mid-demo).
 *
 * Navigation goes via postMessage → the stage sets iframe.src, NOT by the
 * frame navigating itself. The sandboxed frame has an opaque origin, so a
 * navigation it initiates is cross-site to the browser and our SameSite=Lax
 * auth cookies are stripped — the owner-session check then 404s and the stage
 * goes blank after the first click (verified in Chromium). A parent-initiated
 * src load carries cookies exactly like the initial one.
 *
 * Note the absolute `proxyPrefix` — the injected <base> points at the client's
 * site, so a root-relative URL here would resolve against *their* origin.
 */
function clickHandlerScript(origin: string, proxyPrefix: string): string {
  const appOrigin = new URL(proxyPrefix).origin
  return `<script>(function(){
var PREFIX=${jsString(proxyPrefix)},ORIGIN=${jsString(origin)},APP=${jsString(appOrigin)};
document.addEventListener('click',function(e){
if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.defaultPrevented)return;
var n=e.target;
while(n&&n!==document){if(n.tagName==='A'&&n.getAttribute('href'))break;n=n.parentNode}
if(!n||n===document)return;
var raw=n.getAttribute('href');
if(raw.charAt(0)==='#'||n.target==='_blank')return;
var u;try{u=new URL(n.href)}catch(err){return}
if(u.origin!==ORIGIN)return;
e.preventDefault();
if(window.parent!==window){window.parent.postMessage({${PRESENT_NAV_MESSAGE_KEY}:u.pathname+u.search},APP)}
else{window.location.href=PREFIX+encodeURIComponent(u.pathname+u.search)}
},true);})()</script>`
}

/**
 * Runs before any of the page's own scripts.
 *
 * The stage frames this document with `sandbox` and no `allow-same-origin`, so
 * it lives on an opaque origin where `document.cookie` and Web Storage throw
 * SecurityError. WooCommerce themes read both while initialising, the
 * exception aborts their bootstrap, and the backdrop renders as a broken
 * half-header (verified against karakara.lt). Memory-backed stand-ins keep
 * their scripts running; nothing here needs to persist for one demo.
 */
const OPAQUE_ORIGIN_SHIM = `<script>(function(){
var jar='';
try{Object.defineProperty(Document.prototype,'cookie',{configurable:true,get:function(){return jar},set:function(v){jar=String(v)}})}catch(e){}
function mem(){var m={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},
setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},
key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}}}
['localStorage','sessionStorage'].forEach(function(n){
try{void window[n].length}catch(e){try{Object.defineProperty(window,n,{configurable:true,value:mem()})}catch(e2){}}});
})()</script>`

/** Same-origin `<use xlink:href="….svg#id">` sprite files referenced by a page. */
export function findSpriteUrls(html: string, origin: string): string[] {
  const found: string[] = []
  for (const m of html.matchAll(/<use\b[^>]*?\b(?:xlink:href|href)\s*=\s*["']([^"'#]+\.svg)#/gi)) {
    try {
      const url = new URL(m[1], origin)
      if (url.origin === origin && !found.includes(url.toString())) found.push(url.toString())
    } catch {
      // unparseable sprite href — the icon just stays missing
    }
  }
  return found
}

export interface RewritePresentHtmlOptions {
  /** Absolute URL of the fetched page — becomes the document's <base href>. */
  baseHref: string
  /** Absolute `…/api/present/site?bot=…&path=` prefix for in-frame links. */
  proxyPrefix: string
  /** Sprite markup by URL, from `findSpriteUrls`. Inlined so `<use>` works. */
  sprites?: Map<string, string>
}

/**
 * External `<use>` references must be same-origin as the document, which an
 * opaque origin never is — so every icon on the page disappears. Inlining the
 * sprite turns them into plain fragment references, which have no origin rule.
 */
function inlineSprites(html: string, sprites: Map<string, string>, baseHref: string): string {
  if (sprites.size === 0) return html

  const hidden = `<div aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${[
    ...sprites.values(),
  ].join('')}</div>`

  const rewritten = html.replace(
    /(<use\b[^>]*?\b(?:xlink:href|href)\s*=\s*["'])([^"'#]+\.svg)#/gi,
    (whole, prefix: string, href: string) => {
      try {
        return sprites.has(new URL(href, baseHref).toString()) ? `${prefix}#` : whole
      } catch {
        return whole
      }
    },
  )

  const body = rewritten.match(/<body\b[^>]*>/i)
  if (body?.index === undefined) return hidden + rewritten
  const at = body.index + body[0].length
  return rewritten.slice(0, at) + hidden + rewritten.slice(at)
}

/**
 * Make a fetched page render correctly from our origin: resolve its relative
 * URLs against the real site, and route its internal links back through the
 * proxy. Everything else is left untouched — assets load from the client's own
 * origin exactly as they normally would.
 */
export function rewritePresentHtml(
  html: string,
  { baseHref, proxyPrefix, sprites }: RewritePresentHtmlOptions,
): string {
  const origin = new URL(baseHref).origin
  // A <base> of their own would fight ours, and a meta CSP could block the
  // injected scripts. Both are rare, both are cheap to drop.
  const cleaned = inlineSprites(
    html
      .replace(/<base\b[^>]*>/gi, '')
      .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, ''),
    sprites ?? new Map(),
    baseHref,
  )

  // The shim goes first: it must be installed before the page's own scripts.
  const injected = `${OPAQUE_ORIGIN_SHIM}<base href="${baseHref.replace(
    /"/g,
    '&quot;',
  )}">${clickHandlerScript(origin, proxyPrefix)}`

  const head = cleaned.match(/<head\b[^>]*>/i)
  if (head?.index === undefined) return injected + cleaned
  const at = head.index + head[0].length
  return cleaned.slice(0, at) + injected + cleaned.slice(at)
}
