#!/usr/bin/env node

/**
 * Lightweight first-party website verifier for sales-lead research.
 *
 * Usage:
 *   node scripts/research-sales-leads.mjs domain.lt other-domain.lt
 *
 * The script only reads public pages on each supplied domain. It checks the
 * homepage and up to three same-origin contact/about pages, then prints JSON.
 */

const domains = process.argv
  .slice(2)
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean);

if (domains.length === 0) {
  console.error("Provide at least one domain.");
  process.exit(1);
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; LoqaraLeadResearch/1.0; +https://loqara.com)";
const PAGE_TIMEOUT_MS = 12_000;
const CONCURRENCY = 8;
const CONTACT_HINT = /(kontakt|contact|susisiek|apie-mus|apie_mus|about|rekvizit)/i;
const EMAIL_RE =
  /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi;
const PHONE_RE = /(?:\+370|8)\s*(?:\(?\d\)?[\s-]*){7,9}/g;

function decodeHtml(value) {
  return value
    .replaceAll("&commat;", "@")
    .replaceAll("&#64;", "@")
    .replaceAll("&#x40;", "@")
    .replaceAll("&period;", ".")
    .replaceAll("&#46;", ".")
    .replaceAll("&#x2e;", ".")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function textFromHtml(html) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeEmail(value) {
  return value
    .trim()
    .replace(/^mailto:/i, "")
    .split("?")[0]
    .replace(/[),.;:]+$/g, "")
    .toLowerCase();
}

function extractEmails(html) {
  const decoded = decodeHtml(html);
  const raw = [
    ...(decoded.match(EMAIL_RE) ?? []),
    ...[...decoded.matchAll(/mailto:([^"'?\s>]+)/gi)].map((match) => match[1]),
  ];

  return uniq(raw.map(normalizeEmail)).filter(
    (email) =>
      /^[a-z0-9.!#$%&'*+=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) &&
      !email.endsWith(".png") &&
      !email.endsWith(".jpg") &&
      !email.includes("example.") &&
      !email.includes("sentry.") &&
      !["vardenis@pavardenis.lt", "your@email.com", "donate@opencart.com"].includes(
        email,
      ),
  );
}

function extractContactLinks(html, baseUrl) {
  const links = [];
  for (const match of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    const href = decodeHtml(match[1]).trim();
    if (!CONTACT_HINT.test(href)) continue;
    try {
      const url = new URL(href, baseUrl);
      if (url.origin === new URL(baseUrl).origin) links.push(url.href);
    } catch {
      // Ignore invalid links found in third-party markup.
    }
  }
  return uniq(links).slice(0, 3);
}

function detectPlatform(html) {
  const wooSignals = [
    /wp-content\/plugins\/woocommerce|woocommerce\/assets|wc-blocks/i,
    /wc-ajax|woocommerce_params|wc_cart_fragments|woocommerce-product-gallery/i,
    /class=["'][^"']*\bwoocommerce(?:-|\s)/i,
  ].filter((pattern) => pattern.test(html)).length;

  const checks = [
    ["Shopify", /cdn\.shopify\.com|shopify-section|shopify\.theme|_shopify/i],
    ["Magento", /Magento_|mage-cache-storage|static\/version\d+|Magento\//i],
    ["Verskis", /verskis\.lt|verskis platform|sukurta.*verskis/i],
    ["PrestaShop", /prestashop|modules\/ps_/i],
    ["OpenCart", /index\.php\?route=|catalog\/view\/theme/i],
  ];
  return (
    checks.find(([, pattern]) => pattern.test(html))?.[0] ??
    (wooSignals >= 2 ? "WooCommerce" : null)
  );
}

function detectChatbot(html) {
  const patterns = [
    /intercom/i,
    /crisp\.chat|client\.crisp\.chat/i,
    /tawk\.to|embed\.tawk\.to/i,
    /livechatinc|livechat-static/i,
    /tidio\.co|tidiochat/i,
    /zendesk.*web_widget|zopim/i,
    /smartsupp/i,
    /chatwoot/i,
    /messenger_customer_chat/i,
  ];
  return patterns.some((pattern) => pattern.test(html));
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      return { ok: false, url: response.url || url, status: response.status };
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { ok: false, url: response.url || url, status: response.status };
    }
    return {
      ok: true,
      url: response.url,
      status: response.status,
      html: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      url,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHomepage(domain) {
  const clean = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  for (const protocol of ["https:", "http:"]) {
    const result = await fetchPage(`${protocol}//${clean}/`);
    if (result.ok) return result;
  }
  return { ok: false, url: `https://${clean}/`, status: null };
}

async function researchDomain(domain) {
  const home = await fetchHomepage(domain);
  if (!home.ok) {
    return {
      domain,
      reachable: false,
      canonicalUrl: home.url,
      status: home.status,
      error: home.error ?? null,
    };
  }

  const contactPages = [];
  for (const link of extractContactLinks(home.html, home.url)) {
    const page = await fetchPage(link);
    if (page.ok) contactPages.push(page);
  }

  const pages = [home, ...contactPages];
  const combinedHtml = pages.map((page) => page.html).join("\n");
  const homeText = textFromHtml(home.html);
  const title =
    decodeHtml(home.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
      .replace(/\s+/g, " ")
      .trim() || null;

  return {
    domain,
    reachable: true,
    canonicalUrl: home.url,
    title,
    platform: detectPlatform(combinedHtml),
    hasChatbot: detectChatbot(combinedHtml),
    emails: extractEmails(combinedHtml),
    phones: uniq((textFromHtml(combinedHtml).match(PHONE_RE) ?? []).map((v) => v.trim())),
    checkedPages: pages.map((page) => page.url),
    evidence: homeText.slice(0, 700),
  };
}

const results = new Array(domains.length);
let nextIndex = 0;

async function worker() {
  while (nextIndex < domains.length) {
    const index = nextIndex++;
    results[index] = await researchDomain(domains[index]);
  }
}

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, domains.length) }, () => worker()),
);

console.log(JSON.stringify(results, null, 2));
