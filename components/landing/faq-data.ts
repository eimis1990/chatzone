// Shared FAQ content: rendered by the landing accordion (Faq.tsx) AND emitted as
// FAQPage structured data on the homepage (app/page.tsx). Edit here once and
// both stay in sync.
//
// Ordered the way a store owner worries: first "can I trust it with my
// customers", then "what does it cost". Every answer must match shipped
// behaviour and the privacy page; no numbers we cannot back.
type QA = [question: string, answer: string]

export const FAQ_GROUPS: { title: string; items: QA[] }[] = [
  {
    title: 'Before you trust it with your customers',
    items: [
      [
        'What if it gives a customer a wrong answer?',
        'It answers only from your own content and your live catalog, and shows the sources it used. When the answer isn’t there, it says so; Basic and above can also pass the shopper to your team. No AI is right every time, so every conversation is saved with a summary and an AI success score for you to check, and Demand Radar shows you which answers are missing.',
      ],
      [
        'Can I see it on my own store before I pay?',
        'Yes. Send us your store’s address and within one working day we email you a preview of your assistant answering on your own site. It is free, and you don’t enter a card.',
      ],
      [
        'Who is behind Loqara?',
        'Loqara is built and run by its founder, Eimantas Kudarauskas. The same person who ships the features answers hello@loqara.com, so your question reaches someone who can act on it. There is more on the About page.',
      ],
      [
        'How does it know about my business?',
        'You give it your content: your website, documents and FAQs. It answers only from that, with the sources it used. Connect your store and it also searches your live products, with current prices and stock.',
      ],
      [
        'Does it work with Shopify, WooCommerce or Magento?',
        'Yes. It searches connected product catalogs on Shopify, WooCommerce and Magento. Order status lookup, which checks the order number against the billing email, works on WooCommerce and Magento, but not on Shopify. Without a store connection it still answers from your content.',
      ],
      [
        'Can a person take over from the AI?',
        'Yes, on Basic and above. When a shopper needs a person, the conversation moves to a live inbox your team can step into, and goes back to the assistant when you are done.',
      ],
      [
        'Where is my customers’ data kept?',
        'Conversations are stored in the EU and isolated per account. We do not sell personal data, and conversations are not used to train third-party models or other customers’ assistants. You can export or erase your data at any time. Our privacy policy lists what we collect and every provider we use.',
      ],
    ],
  },
  {
    title: 'Setup, plans and billing',
    items: [
      [
        'How long does setup take, and does it touch my site?',
        'The preview takes us one working day. After that you add one script tag to your site; the widget loads in its own frame, apart from your page’s code and styles, and removing the tag removes it. Setting it up yourself is three steps. If we do it for you, it is live in about one to two weeks.',
      ],
      [
        'What does it cost to start?',
        'Nothing. The Free plan includes 50 conversations a month, one assistant, one language and basic activity statistics, with no card or setup fee. Basic is €49/month or €490/year and includes 400 conversations, live handoff, lead capture, voice dictation, full analytics and product search. Starter adds order lookup, multiple languages, two bots and badge removal. A new text session starts after 24 hours of inactivity or in a new UTC month; voice calls use their separate minute allowance. Existing Free accounts receive a 30-day transition notice.',
      ],
      [
        'What counts as a conversation?',
        'A text session is counted once when the assistant responds. A new session starts after 24 hours without activity, or on the first automated reply in a new UTC calendar month. Previews and human-only exchanges are excluded. Voice calls use their separate minute allowance.',
      ],
      [
        'What happens if I reach my conversation limit?',
        'Conversations in progress carry on. New ones pause until you upgrade, buy an eligible conversation pack, or the UTC calendar month resets. Nothing is charged automatically, so there are no surprise bills.',
      ],
      [
        'Can I change or cancel anytime?',
        'Yes. Upgrade, downgrade or cancel whenever you like. Plan changes take effect immediately with prorated billing. Cancellation takes effect at the end of your paid period.',
      ],
      [
        'Which languages does it speak?',
        'English and Lithuanian today, with more on the way. Free and Basic include one language of your choice. Starter and above include all supported languages.',
      ],
    ],
  },
]

/** Every question in page order, for the FAQPage structured data. */
export const FAQ: QA[] = FAQ_GROUPS.flatMap((group) => group.items)
