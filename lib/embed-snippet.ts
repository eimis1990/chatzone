/**
 * Build the widget embed snippet for a bot. Single source of truth — used by
 * the Embed page and the onboarding wizard's Install step, so the copyable
 * code can never drift between the two.
 */
export function buildEmbedSnippet(appUrl: string, publicKey: string): string {
  return `<script
  src="${appUrl}/widget.js"
  data-bot-key="${publicKey}"
  async
></script>`
}
