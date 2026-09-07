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

/** Native input per field type — no picker libraries; the browser does dates/numbers. */
function FieldInput({
  field,
  value,
  onChange,
  className,
  style,
  placeholder,
}: {
  field: LeadField
  value: string
  onChange: (v: string) => void
  className: string
  style: React.CSSProperties
  placeholder?: string
}) {
  const type = field.type ?? (field.key === 'email' ? 'email' : 'text')
  const common = {
    id: `lead-${field.key}`,
    value,
    required: field.required,
    'aria-label': field.label,
    placeholder,
    className,
    style,
  }
  if (type === 'textarea') {
    return <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} className={`${className} resize-none`} />
  }
  if (type === 'select') {
    return (
      <select {...common} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder ?? field.label}</option>
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  return (
    <input
      {...common}
      type={type}
      inputMode={type === 'tel' ? 'tel' : type === 'number' ? 'numeric' : undefined}
      min={type === 'number' ? 0 : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

interface LeadFormProps {
  fields: LeadField[]
  /** Values the assistant already learned in chat (from `open_lead_form`). */
  initialValues?: Record<string, string>
  primaryColor: string
  /** Widget language — picks the built-in strings. */
  lang?: BotLanguage
  /** Custom heading; empty → the built-in default for `lang`. */
  title?: string
  /** Component-library variant: 'minimal' = frameless, placeholder-labelled fields. */
  variant?: 'default' | 'minimal'
  onSubmit: (data: Record<string, string>) => Promise<void>
  onDismiss: () => void
}

export function LeadForm({
  fields,
  primaryColor,
  lang = 'en',
  title,
  variant = 'default',
  initialValues,
  onSubmit,
  onDismiss,
}: LeadFormProps) {
  const t = STRINGS[lang] ?? STRINGS.en
  const heading = title?.trim() || t.title
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, initialValues?.[f.key] ?? '']))
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

  // Minimal variant — frameless: quiet heading with inline dismiss, pill
  // inputs labelled by placeholder, slim submit. Same behavior, less chrome.
  if (variant === 'minimal') {
    return (
      // max-h + inner scroll: a 7-field reservation form must never push the
      // submit button below the widget's bottom edge (seen on Taujėnų dvaras).
      <div className="mx-4 mb-4 flex max-h-[78%] min-h-0 flex-col">
        <div className="mb-1.5 flex shrink-0 items-center justify-between">
          <p className="text-xs font-medium text-gray-500">{heading}</p>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="text-gray-400 hover:text-gray-600 text-base leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={values[field.key] ?? ''}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
              placeholder={`${field.label}${field.required ? ' *' : ''}`}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
          ))}
          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full shrink-0 rounded-full py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? t.sending : t.send}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-4 flex max-h-[78%] min-h-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 pt-3 pb-2">
        <p className="text-sm font-semibold text-gray-800">{heading}</p>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`lead-${field.key}`}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
            </label>
            <FieldInput
              field={field}
              value={values[field.key] ?? ''}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
          </div>
        ))}
        {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
        </div>
        <div className="shrink-0 border-t border-gray-100 p-3">
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {submitting ? t.sending : t.send}
        </button>
        </div>
      </form>
    </div>
  )
}
