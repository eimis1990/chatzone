import type { NextConfig } from "next";

/**
 * Content-Security-Policy, deployed REPORT-ONLY first (SEO/GEO plan task 6.2).
 * Promote to enforcing `Content-Security-Policy` only after the report-only
 * period shows no violations across: homepage, auth, app dashboard, widget
 * embed (incl. voice call), Stripe checkout redirect, Supabase storage loads,
 * GA, and the owner presentation flow.
 *
 * Notes on the allowances:
 * - script-src 'unsafe-inline': required by Next's inline bootstrap and the
 *   GA init snippet; tighten to nonces only with a dedicated effort.
 * - img-src https:: widget product cards render images from arbitrary
 *   customer store domains — a host allowlist is impossible by design.
 * - connect-src: Supabase (REST/realtime/storage), GA beacons, ElevenLabs
 *   voice websockets.
 * - NO frame-ancestors / X-Frame-Options anywhere: /embed must remain
 *   embeddable in ANY customer site. If frame-ancestors is ever wanted for
 *   the app shell, it must be scoped per-route and never cover /embed.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com https://*.elevenlabs.io wss://*.elevenlabs.io",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Voice needs the mic on our own documents (the embed iframe is our
          // origin; the host page delegates via allow="microphone" in widget.js).
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), payment=()" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default nextConfig;
