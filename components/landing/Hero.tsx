'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { CheckIcon, SparklesIcon, ArrowDownRightIcon } from 'lucide-react'
import { EmailCapture } from './EmailCapture'

export function Hero() {
  const reduce = useReducedMotion()
  return (
    <section className="relative overflow-hidden bg-[#0f1f16] text-white">
      {/* Mesh glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 size-[34rem] rounded-full bg-[#2f6b44]/40 blur-[120px]" />
        <div className="absolute right-0 top-10 size-[30rem] rounded-full bg-[#9BDA48]/30 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-[26rem] rounded-full bg-[#1d4a30]/50 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-32 pb-20 lg:grid-cols-2 lg:pt-40 lg:pb-28">
        {/* Copy */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-[#a9d6b4]"
          >
            <SparklesIcon className="size-3.5" />
            AI SUPPORT FOR MODERN STORES
          </motion.p>

          <motion.h1
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Answer every customer,
            <br />
            <span className="text-[#7cc08a]">day or night.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 max-w-md text-lg leading-relaxed text-white/75"
          >
            A chat &amp; voice agent that knows your products, captures leads, looks up orders, and
            hands off to your team — embedded with one line of code.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-7 flex items-center gap-2 text-sm text-[#a9d6b4]"
          >
            <CheckIcon className="size-4" />
            Free while in early access — no credit card required.
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-5"
          >
            <EmailCapture source="hero" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-white/60"
          >
            <ArrowDownRightIcon className="size-3.5" />
            It&apos;s live on this page — try the chat bubble in the corner.
          </motion.p>
        </div>

        {/* Product mockup */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-sm"
        >
          <ChatMockup />
        </motion.div>
      </div>
    </section>
  )
}

/** A faux Chatzone chat window — sells the product without a photo. */
function ChatMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
      <div className="flex items-center gap-3 bg-[#13241b] px-4 py-3.5 text-white">
        <div className="flex size-8 items-center justify-center rounded-full bg-[#9BDA48] text-sm font-bold text-[#101213]">J</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Jarvis</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-white/70">
            <span className="inline-block size-1.5 rounded-full bg-green-400" />
            Online
          </p>
        </div>
      </div>
      <div className="space-y-3 bg-[#fbfcfb] px-4 py-5 text-sm">
        <Bubble who="bot">Hi! I&apos;m Jarvis. Looking for something for dry skin?</Bubble>
        <Bubble who="user">Yes, a gift set under €40</Bubble>
        <Bubble who="bot">Here are a few that fit 👇</Bubble>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {['Hydra Set', 'Calm Ritual'].map((t) => (
            <div key={t} className="rounded-xl border bg-white p-2">
              <div className="mb-2 h-14 rounded-lg bg-gradient-to-br from-[#dcebe1] to-[#cfe6d6]" />
              <p className="truncate text-xs font-medium text-gray-800">{t}</p>
              <p className="text-xs text-gray-500">€39.00</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t bg-white px-4 py-3">
        <div className="h-9 flex-1 rounded-full border border-gray-200 px-3 text-xs leading-9 text-gray-400">
          Type a message…
        </div>
        <div className="flex size-9 items-center justify-center rounded-full bg-[#9BDA48] text-[#101213]">→</div>
      </div>
    </div>
  )
}

function Bubble({ who, children }: { who: 'bot' | 'user'; children: React.ReactNode }) {
  const isUser = who === 'user'
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
          isUser ? 'bg-[#9BDA48] text-[#101213]' : 'bg-gray-100 text-gray-800'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
