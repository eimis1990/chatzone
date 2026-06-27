import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
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

const TITLE = "Loqara — AI chat & voice agent for modern stores";
const DESCRIPTION =
  "Answer every customer, day or night. A chat & voice agent that knows your products, captures leads, looks up orders, and hands off to your team — embedded in one line.";

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
  },
  openGraph: {
    title: TITLE,
    description:
      "AI chat & voice support for e-commerce: grounded answers, product search, order lookups, live handoff, and analytics.",
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    images: [
      {
        url: "/landing/og.png",
        width: 1200,
        height: 630,
        alt: "Loqara — AI chat & voice agent for modern stores",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "AI chat & voice support for e-commerce: grounded answers, product search, order lookups, live handoff, and analytics.",
    images: ["/landing/og.png"],
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
      </body>
    </html>
  );
}
