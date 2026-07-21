import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import {
  Geist,
  Geist_Mono,
  Inter,
  Poppins,
  Nunito,
  Plus_Jakarta_Sans,
  Lora,
  Atma,
  Baloo_2,
  DM_Sans,
  DynaPuff,
  Fredoka,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  JetBrains_Mono,
  Manrope,
  Mali,
  Merriweather,
  Playfair_Display,
  Quicksand,
  Roboto_Mono,
  Source_Serif_4,
  Urbanist,
  Work_Sans,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

// Selectable chat fonts (see lib/fonts.ts). Each exposes a CSS variable used by
// the chat container's inline font-family.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
  display: "swap",
});
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

// Optional chat-font catalog. Keep these self-hosted through next/font, but do
// not preload all families on every page; the browser fetches the chosen face
// when the configurator or widget actually uses it.
const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const dynaPuff = DynaPuff({
  variable: "--font-dynapuff",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const mali = Mali({
  variable: "--font-mali",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  preload: false,
  display: "swap",
});
const atma = Atma({
  variable: "--font-atma",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  preload: false,
  display: "swap",
});
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  preload: false,
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});
const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin", "latin-ext"],
  preload: false,
  display: "swap",
});

const fontVariables = [
  inter,
  poppins,
  nunito,
  jakarta,
  lora,
  urbanist,
  manrope,
  dmSans,
  ibmPlexSans,
  workSans,
  quicksand,
  fredoka,
  baloo,
  dynaPuff,
  mali,
  atma,
  merriweather,
  playfair,
  sourceSerif,
  ibmPlexMono,
  jetbrainsMono,
  robotoMono,
]
  .map((f) => f.variable)
  .join(" ");

const TITLE = "Loqara — AI chat & voice agent for any website";
const DESCRIPTION =
  "Answer every customer, day or night. An AI chat & voice agent that knows your products, captures leads, looks up orders — live in one line of code.";

// Bing Webmaster Tools site verification. Set NEXT_PUBLIC_BING_SITE_VERIFICATION
// to emit <meta name="msvalidate.01" ...>. Left unset (e.g. if you verify Bing
// by importing from Google Search Console instead), no tag is rendered.
const BING_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI chat agent",
    "AI voice agent",
    "ecommerce customer support",
    "AI chatbot for online stores",
    "live chat widget",
    "AI customer service",
    "product search chatbot",
    "order lookup chatbot",
    "Loqara",
  ],
  // No site-wide canonical here — each page sets its own so sub-pages
  // (privacy, terms) don't all canonicalize to the homepage.
  verification: {
    google: "Ju35YHEkl87l80jTznv0fN40cVZIAVGGYWHJ4MRF-QI",
    ...(BING_VERIFICATION
      ? { other: { "msvalidate.01": BING_VERIFICATION } }
      : {}),
  },
  openGraph: {
    title: TITLE,
    description:
      "AI chat & voice support for any website: grounded answers, product search, order lookups, live handoff, and analytics.",
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    images: [
      {
        url: "/landing/og.jpg?v=4",
        width: 1200,
        height: 630,
        alt: "Loqara — AI chat & voice agent for any website",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "AI chat & voice support for any website: grounded answers, product search, order lookups, live handoff, and analytics.",
    images: ["/landing/og.jpg?v=4"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fontVariables} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
