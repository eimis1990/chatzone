import type { BotLanguage, SuggestedQuestionAction } from '@/lib/types'

/**
 * One-click quick-action suggestions for the configurator, grouped by business
 * type. Each suggestion carries per-language (en/lt) label + prompt variants so
 * inserting one prefills the ACTIVE language correctly.
 */

/** The object form of a quick action as the configurator form stores it. */
export interface QuickActionDraft {
  label: string
  prompt: string
  url: string
  action?: SuggestedQuestionAction
}

export interface QuickActionSuggestion {
  id: string
  label: Record<BotLanguage, string>
  /** Message sent to the bot (omit for typed actions). */
  prompt?: Record<BotLanguage, string>
  /** Typed behavior ('handoff' | 'lead') — takes precedence over prompt. */
  action?: SuggestedQuestionAction
}

export interface QuickActionSuggestionGroup {
  id: 'ecommerce' | 'service'
  title: string
  suggestions: QuickActionSuggestion[]
}

export const QUICK_ACTION_SUGGESTIONS: QuickActionSuggestionGroup[] = [
  {
    id: 'ecommerce',
    title: 'E-commerce',
    suggestions: [
      {
        id: 'top-products',
        label: { en: 'TOP products', lt: 'TOP prekės' },
        prompt: {
          en: 'Show me your most popular products',
          lt: 'Parodyk populiariausias prekes',
        },
      },
      {
        id: 'delivery-info',
        label: { en: 'Delivery info', lt: 'Pristatymo informacija' },
        prompt: {
          en: 'What are your delivery options and how long does shipping take?',
          lt: 'Kokie yra pristatymo būdai ir kiek užtrunka pristatymas?',
        },
      },
      {
        id: 'return-policy',
        label: { en: 'Return policy', lt: 'Grąžinimo sąlygos' },
        prompt: {
          en: 'What is your return policy?',
          lt: 'Kokios yra prekių grąžinimo sąlygos?',
        },
      },
      {
        id: 'ecom-handoff',
        label: { en: 'Talk to a human', lt: 'Kalbėti su žmogumi' },
        action: 'handoff',
      },
    ],
  },
  {
    id: 'service',
    title: 'Services',
    suggestions: [
      {
        id: 'services-prices',
        label: { en: 'Services & prices', lt: 'Paslaugos ir kainos' },
        prompt: {
          en: 'What services do you offer and how much do they cost?',
          lt: 'Kokias paslaugas teikiate ir kiek jos kainuoja?',
        },
      },
      {
        id: 'book-visit',
        label: { en: 'Book a visit', lt: 'Registruotis vizitui' },
        prompt: {
          en: 'I would like to book a visit.',
          lt: 'Norėčiau užsiregistruoti vizitui.',
        },
      },
      {
        id: 'service-handoff',
        label: { en: 'Talk to a human', lt: 'Kalbėti su žmogumi' },
        action: 'handoff',
      },
      {
        id: 'leave-details',
        label: { en: 'Leave your details', lt: 'Palikite savo kontaktus' },
        action: 'lead',
      },
    ],
  },
]

/** Materialize a suggestion into a form-shaped quick action for one language. */
export function buildQuickAction(
  suggestion: QuickActionSuggestion,
  lang: BotLanguage,
): QuickActionDraft {
  return {
    label: suggestion.label[lang] ?? suggestion.label.en,
    prompt: suggestion.action ? '' : (suggestion.prompt?.[lang] ?? suggestion.prompt?.en ?? ''),
    url: '',
    ...(suggestion.action ? { action: suggestion.action } : {}),
  }
}
