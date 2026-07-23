import { BanIcon } from 'lucide-react'
import type { BotLanguage } from '@/lib/types'

const COPY: Record<BotLanguage, string> = {
  en: "You've been blocked. Try again in 24 hours.",
  lt: 'Jūs užblokuoti. Bandykite dar kartą po 24 valandų.',
}

export function VisitorBlockedScreen({ language }: { language: BotLanguage }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center bg-white px-8 text-center"
      role="alert"
    >
      <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-red-50 text-red-600">
        <BanIcon className="size-10" strokeWidth={2.25} aria-hidden="true" />
      </div>
      <p className="max-w-xs text-base font-semibold leading-6 text-red-600">
        {COPY[language] ?? COPY.en}
      </p>
    </div>
  )
}
