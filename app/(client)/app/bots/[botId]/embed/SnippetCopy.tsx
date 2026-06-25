'use client'

import { useState } from 'react'
import { CopyIcon, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <div className="relative">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-[#101213] p-4 pr-24 text-sm leading-relaxed text-gray-100">
        <code>{snippet}</code>
      </pre>
      <Button
        type="button"
        size="sm"
        onClick={handleCopy}
        className="absolute right-3 top-3 h-8 rounded-md"
        aria-label="Copy snippet to clipboard"
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
