'use client'

import { useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** Optional per-tag validation; invalid entries are rejected with a shake-free no-op. */
  validate?: (tag: string) => boolean
  max?: number
  id?: string
  className?: string
  'aria-label'?: string
}

/**
 * Comma/Enter-separated tags rendered as removable chips. Pasting "a, b, c"
 * adds three. Used for lead-capture keywords, extra emails and select options.
 */
export function TagInput({ value, onChange, placeholder, validate, max, id, className, ...rest }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const parts = raw
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !value.includes(t))
      .filter((t) => (validate ? validate(t) : true))
    if (!parts.length) {
      setDraft('')
      return
    }
    const next = [...value, ...parts]
    onChange(max ? next.slice(0, max) : next)
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-xs focus-within:ring-2 focus-within:ring-ring/40',
        className,
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            aria-label={`Remove ${tag}`}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </span>
      ))}
      {(!max || value.length < max) && (
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(draft)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[8ch] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
          {...rest}
        />
      )}
    </div>
  )
}
