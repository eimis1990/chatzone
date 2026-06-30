import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import {
  Geist,
  Geist_Mono,
  Inter,
  Poppins,
  Nunito,
  Plus_Jakarta_Sans,
  Lora,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Selectable chat fonts (see lib/fonts.ts). Each exposes a CSS variable used by
// the chat container's inline font-family.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });

const fontVariables = [inter, poppins, nunito, jakarta, lora]
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
        url: "/landing/og.png?v=2",
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
    images: ["/landing/og.png?v=2"],
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
        {children}
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
