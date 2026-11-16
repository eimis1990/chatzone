import type { BotLanguage } from '@/lib/types'

/** Editable starter copy; safe even when lead capture and human handoff are off. */
export function messageTemplates(language: BotLanguage, displayName?: string) {
  if (language === 'lt') {
    return {
      greeting: displayName
        ? `Sveiki! 👋 Esu ${displayName}. Kuo galiu jums padėti?`
        : 'Sveiki! 👋 Kuo galiu jums padėti?',
      fallbackMessage: 'Atsiprašau, neturiu patikimo atsakymo į šį klausimą. 🤔 Gal galite patikslinti klausimą arba pateikti daugiau informacijos?',
    }
  }
  return {
    greeting: displayName
      ? `Hi! 👋 I'm ${displayName}. How can I help you today?`
      : 'Hi! 👋 How can I help you today?',
    fallbackMessage: "Sorry, I don't have a reliable answer to that yet. 🤔 Could you rephrase your question or share a little more detail?",
  }
}

/** Fill missing/blank messages without changing custom copy or other content. */
export function seedMessageTemplates<T extends { greeting?: string; fallbackMessage?: string }>(
  language: BotLanguage,
  content: T | undefined,
  displayName?: string,
) {
  const templates = messageTemplates(language, displayName)
  return Object.assign({}, content, {
    greeting: content?.greeting?.trim() ? content.greeting : templates.greeting,
    fallbackMessage: content?.fallbackMessage?.trim() ? content.fallbackMessage : templates.fallbackMessage,
  })
}
