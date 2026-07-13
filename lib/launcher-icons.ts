/**
 * Launcher + close icons for the floating chat button, as raw SVG strings so
 * the same art renders in the configurator picker (dangerouslySetInnerHTML),
 * the TestChat preview, and the vanilla widget.
 *
 * ⚠️ public/widget.js keeps a synced COPY of these strings (it's a static file
 * and can't import) — update both together.
 */

export type LauncherIconKey =
  | 'chat'
  | 'message-circle'
  | 'message-dots'
  | 'help'
  | 'sparkles'
  | 'headset'
  | 'send'
  | 'zap'
  | 'smile'
  | 'shopping-bag'

export type LauncherCloseIconKey = 'x' | 'chevron-down'

const stroked = (paths: string, size = 26) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" aria-hidden="true">${paths}</svg>`

/** The classic double-bubble (filled) — the widget's original default. */
const CHAT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26" aria-hidden="true">' +
  '<path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />' +
  '<path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />' +
  '</svg>'

export const LAUNCHER_ICONS: Record<LauncherIconKey, string> = {
  chat: CHAT,
  'message-circle': stroked('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
  'message-dots': stroked(
    '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/>',
  ),
  help: stroked(
    '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  ),
  sparkles: stroked(
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  ),
  headset: stroked(
    '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
  ),
  send: stroked(
    '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  ),
  zap: stroked(
    '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  ),
  smile: stroked(
    '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  ),
  'shopping-bag': stroked(
    '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  ),
}

export const LAUNCHER_CLOSE_ICONS: Record<LauncherCloseIconKey, string> = {
  x:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" width="24" height="24" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6L6 18" /></svg>',
  'chevron-down':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="26" height="26" aria-hidden="true">' +
    '<path d="m6 9 6 6 6-6" /></svg>',
}

export const LAUNCHER_ICON_LABELS: Record<LauncherIconKey, string> = {
  chat: 'Chat bubbles',
  'message-circle': 'Speech bubble',
  'message-dots': 'Typing dots',
  help: 'Question',
  sparkles: 'Sparkles (AI)',
  headset: 'Support headset',
  send: 'Paper plane',
  zap: 'Lightning',
  smile: 'Smiley',
  'shopping-bag': 'Shopping bag',
}
