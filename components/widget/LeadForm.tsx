'use client'

import { useState, type FormEvent } from 'react'
import type { LeadField, BotLanguage } from '@/lib/types'

// Built-in strings per widget language; the heading can be overridden per bot.
const STRINGS: Record<BotLanguage, {
  title: string
  send: string
  sending: string
  thanks: string
  fillIn: string
  wrong: string
}> = {
  en: {
    title: 'Leave your details',
    send: 'Send',
    sending: 'Sending…',
    thanks: 'Thanks! We’ll be in touch.',
    fillIn: 'Please fill in:',
    wrong: 'Something went wrong. Please try again.',
  },
  lt: {
    title: 'Palikite savo kontaktus',
    send: 'Siųsti',
    sending: 'Siunčiama…',
    thanks: 'Ačiū! Susisieksime su jumis.',
    fillIn: 'Užpildykite:',
    wrong: 'Įvyko klaida. Bandykite dar kartą.',
  },
}

interface LeadFormProps {
  fields: LeadField[]
  primaryColor: string
  /** Widget language — picks the built-in strings. */
  lang?: BotLanguage
  /** Custom heading; empty → the built-in default for `lang`. */
  title?: string
  onSubmit: (data: Record<string, string>) => Promise<void>
  onDismiss: () => void
}

export function LeadForm({ fields, primaryColor, lang = 'en', title, onSubmit, onDismiss }: LeadFormProps) {
  const t = STRINGS[lang] ?? STRINGS.en
  const heading = title?.trim() || t.title
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, '']))
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const missing = fields.filter((f) => f.required && !values[f.key]?.trim())
    if (missing.length > 0) {
      setError(`${t.fillIn} ${missing.map((f) => f.label).join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(values)
      setSubmitted(true)
    } catch {
      setError(t.wrong)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white p-4 text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="text-sm font-medium text-gray-800">{t.thanks}</p>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{heading}</p>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 space-y-3" noValidate>
        {fields.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`lead-${field.key}`}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
            </label>
            <input
              id={`lead-${field.key}`}
              type={field.key === 'email' ? 'email' : 'text'}
              value={values[field.key] ?? ''}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              required={field.required}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
          </div>
        ))}
        {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {submitting ? t.sending : t.send}
        </button>
      </form>
    </div>
  )
}
