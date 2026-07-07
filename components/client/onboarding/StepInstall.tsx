'use client'

import { useEffect, useRef, useState } from 'react'
import { PartyPopperIcon, RadarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/browser'
import { buildEmbedSnippet } from '@/lib/embed-snippet'
import { SnippetCopy } from '@/components/client/embed/SnippetCopy'

const POLL_MS = 3000

interface StepInstallProps {
  botId: string
  publicKey: string
  appUrl: string
  onFinish: () => void
}

/**
 * Step 5 — install. Shows the embed snippet (same builder as the Embed page)
 * and polls bots.last_seen_at: the widget stamps it when it loads the bot's
 * config on a real page, so a non-null value means "installed & live".
 */
export function StepInstall({ botId, publicKey, appUrl, onFinish }: StepInstallProps) {
  const snippet = buildEmbedSnippet(appUrl, publicKey)
  const [installed, setInstalled] = useState(false)
  const celebratedRef = useRef(false)

  useEffect(() => {
    if (installed) return
    const supabase = createBrowserClient()
    let cancelled = false

    const tick = async () => {
      const { data } = await supabase
        .from('bots')
        .select('last_seen_at')
        .eq('id', botId)
        .single<{ last_seen_at: string | null }>()
      if (!cancelled && data?.last_seen_at) setInstalled(true)
    }

    void tick()
    const id = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [botId, installed])

  // Celebrate once when the widget is first seen live.
  useEffect(() => {
    if (!installed || celebratedRef.current) return
    celebratedRef.current = true
    void (async () => {
      try {
        const { default: confetti } = await import('canvas-confetti')
        confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 } })
      } catch {
        // confetti is decoration — never let it break the step
      }
    })()
  }, [installed])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Install your bot</h1>
        <p className="text-sm text-muted-foreground">
          Paste this snippet before the closing{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;/body&gt;</code> tag of your
          website — the chat bubble appears on every page that includes it.
        </p>
      </div>

      <SnippetCopy snippet={snippet} botId={botId} />

      {installed ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm dark:border-green-800 dark:bg-green-950/20">
          <PartyPopperIcon className="size-5 shrink-0 text-green-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              Your bot is live on your site!
            </p>
            <p className="text-green-700 dark:text-green-300">
              We detected the widget loading — visitors can start chatting right away.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <RadarIcon className="size-5 shrink-0 animate-pulse text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">Checking your site for the widget…</p>
            <p className="text-muted-foreground">
              Once you&apos;ve deployed the snippet, open your site — we&apos;ll detect it here
              automatically.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {!installed && (
          <Button type="button" variant="ghost" onClick={onFinish}>
            I&apos;ll install it later
          </Button>
        )}
        <Button onClick={onFinish} className="h-10 px-6">
          {installed ? 'Finish — go to my bot' : 'Finish'}
        </Button>
      </div>
    </div>
  )
}
