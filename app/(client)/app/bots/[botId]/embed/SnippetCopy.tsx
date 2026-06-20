'use client'

import { useState } from 'react'

interface SnippetCopyProps {
  snippet: string
}

export function SnippetCopy({ snippet }: SnippetCopyProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without Clipboard API
      const ta = document.createElement('textarea')
      ta.value = snippet
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative group">
      <pre className="rounded-lg bg-muted border text-sm p-4 overflow-x-auto whitespace-pre-wrap break-all">
        <code>{snippet}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded bg-background border shadow-sm hover:bg-muted transition-colors"
        aria-label="Copy snippet to clipboard"
      >
        {copied ? '✓ Copied!' : 'Copy'}
      </button>
    </div>
  )
}
