#!/usr/bin/env node
import fs from "node:fs";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: node scripts/research-sales-lead-platforms.mjs <rows.json>");
const rows = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const UA = "Mozilla/5.0 (compatible; LoqaraPlatformResearch/1.0; +https://loqara.com)";
const TIMEOUT = 18000;
const CONCURRENCY = 10;

function uniq(values) { return [...new Set(values.filter(Boolean))]; }
function has(html, re) { return re.test(html); }

async function get(url, accept = "text/html,application/xhtml+xml") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": UA, accept },
    });
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url: response.url || url,
      contentType,
      text: text.slice(0, 4_000_000),
      headers: {
        server: response.headers.get("server"),
        poweredBy: response.headers.get("x-powered-by"),
        setCookie: response.headers.get("set-cookie"),
      },
    };
  } catch (error) {
    return { ok: false, status: null, url, contentType: "", text: "", headers: {}, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

function storefrontSignals(html) {
  return {
    productSchema: /["']@type["']\s*:\s*["']Product["']/i.test(html),
    offerSchema: /["']@type["']\s*:\s*["']Offer["']/i.test(html),
    cart: /(?:add[-_ ]?to[-_ ]?cart|shopping[-_ ]?cart|cart-drawer|mini[-_ ]?cart|krepšel|groz|ostukorv)/i.test(html),
    checkout: /(?:checkout|atsiskaity|apmokėj|noformit-zakaz|vormista tellimus)/i.test(html),
  };
}

function detectInitial(page) {
  const html = page.text;
  const headers = JSON.stringify(page.headers);
  const signals = [];
  const add = (name, re, source = html) => { if (re.test(source)) signals.push(name); };

  add("shopify-cdn", /cdn\.shopify\.com|\/cdn\/shop\//i);
  add("shopify-runtime", /Shopify\.(?:theme|shop|routes)|shopify-section|_shopify/i);
  add("myshopify-domain", /[a-z0-9-]+\.myshopify\.com/i);
  add("magento-runtime", /Magento_|mage-cache-storage|Magento_Ui|requirejs-config|\/static\/version\d+/i);
  add("magento-cookie", /private_content_version|X-Magento-Vary/i, headers);
  add("verskis-generator", /<meta[^>]+name=["']generator["'][^>]+content=["'][^"']*Verskis/i);
  add("verskis-assets", /verskis\.lt|assets\.verskis|sukurta[^<]{0,80}verskis/i);
  add("woo-plugin-assets", /wp-content\/plugins\/woocommerce|woocommerce\/assets|wc-blocks/i);
  add("woo-runtime", /wc-ajax|woocommerce_params|wc_cart_fragments|woocommerce-product-gallery/i);
  add("woo-body", /class=["'][^"']*\bwoocommerce(?:-|\s)/i);
  add("prestashop", /prestashop|\/modules\/ps_|prestashop\.urls|prestashop\.static_token/i);
  add("opencart", /index\.php\?route=(?:product|checkout|common)\/|catalog\/view\/theme|route=extension\/module/i);
  add("shopware", /shopware|\/bundles\/storefront|sw-context-token/i);
  add("bigcommerce", /cdn\d*\.bigcommerce\.com|stencil-utils|BigCommerce/i);
  add("salesforce-commerce", /demandware|dwcont|SalesforceCommerceCloud/i);
  add("odoo", /\/web\/assets\/|odoo\.define|website_sale/i);
  add("wordpress", /wp-content|wp-includes|<meta[^>]+content=["']WordPress/i);
  add("webflow", /webflow\.js|data-wf-page|website-files\.com/i);
  add("wix", /wixstatic\.com|X-Wix-|wix-image/i, html + headers);
  add("squarespace", /static\.squarespace\.com|squarespace-cdn|Squarespace/i);
  add("drupal", /Drupal\.settings|drupalSettings|sites\/default\/files|X-Generator[^\n]*Drupal/i, html + headers);
  add("joomla", /<meta[^>]+content=["']Joomla|\/media\/system\/js\//i);
  add("laravel", /laravel_session|XSRF-TOKEN|<meta[^>]+name=["']csrf-token/i, html + headers);
  add("nextjs", /\/_next\/static\/|__NEXT_DATA__/i);
  add("nuxt", /\/_nuxt\/|__NUXT__/i);
  add("gatsby", /___gatsby|gatsby-script/i);
  add("craft-cms", /Craft\.csrfTokenName|craftcms/i);
  add("typo3", /typo3temp|TYPO3/i);
  return uniq(signals);
}

async function probeJson(url) {
  const page = await get(url, "application/json,text/plain,*/*");
  if (!page.ok || !/json/i.test(page.contentType + page.text.slice(0,1))) return { ok: false, page };
  try { return { ok: true, page, json: JSON.parse(page.text) }; }
  catch { return { ok: false, page }; }
}

async function classify(row) {
  const home = await get(row.website);
  if (!home.ok) {
    return { ...row, canonical_url: home.url, platform: "Unknown", confidence: "low", commerce_fit: "manual_review", evidence: [], error: home.error || `HTTP ${home.status}` };
  }

  const signals = detectInitial(home);
  const shop = storefrontSignals(home.text);
  const origin = new URL(home.url).origin;
  const probes = [];

  let shopifyProducts = false;
  if (signals.some(s => s.startsWith("shopify"))) {
    const p = await probeJson(`${origin}/products.json?limit=1`);
    shopifyProducts = p.ok && Array.isArray(p.json?.products);
    if (shopifyProducts) probes.push("working /products.json");
  }

  let wooProducts = false;
  const wooSignalCount = signals.filter(s => s.startsWith("woo-")).length;
  if (wooSignalCount > 0 || signals.includes("wordpress")) {
    const p = await probeJson(`${origin}/wp-json/wc/store/v1/products?per_page=1`);
    wooProducts = p.ok && Array.isArray(p.json) && (p.json.length === 0 || p.json.every(x => x && typeof x === "object" && ("prices" in x || "add_to_cart" in x)));
    if (wooProducts) probes.push("working Woo Store API");
  }

  let wordpressApi = false;
  if (signals.includes("wordpress") || wooSignalCount > 0) {
    const p = await probeJson(`${origin}/wp-json/`);
    wordpressApi = p.ok && typeof p.json === "object" && p.json !== null && ("namespaces" in p.json || "routes" in p.json);
    if (wordpressApi) probes.push("working WordPress REST API");
  }

  let platform = "Custom/Other";
  let confidence = "medium";
  let fit = "custom_or_feed_required";

  if (signals.some(s => s.startsWith("shopify")) && (shopifyProducts || signals.filter(s => s.startsWith("shopify")).length >= 2)) {
    platform = "Shopify"; confidence = "high"; fit = "native";
  } else if (signals.some(s => s.startsWith("magento"))) {
    platform = "Magento"; confidence = signals.includes("magento-runtime") ? "high" : "medium"; fit = "native";
  } else if (signals.includes("verskis-generator") || signals.includes("verskis-assets")) {
    platform = "Verskis"; confidence = signals.includes("verskis-generator") ? "high" : "medium"; fit = "native";
  } else if (wooSignalCount >= 2 || (wooProducts && wooSignalCount >= 1)) {
    platform = "WooCommerce"; confidence = "high"; fit = "native";
  } else if (signals.includes("prestashop")) {
    platform = "PrestaShop"; confidence = "high";
  } else if (signals.includes("opencart")) {
    platform = "OpenCart"; confidence = "high";
  } else if (signals.includes("shopware")) {
    platform = "Shopware"; confidence = "high";
  } else if (signals.includes("bigcommerce")) {
    platform = "BigCommerce"; confidence = "high";
  } else if (signals.includes("salesforce-commerce")) {
    platform = "Salesforce Commerce Cloud"; confidence = "high";
  } else if (signals.includes("odoo")) {
    platform = "Odoo"; confidence = "high";
  } else if (signals.includes("wix")) {
    platform = "Wix"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("webflow")) {
    platform = "Webflow"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("squarespace")) {
    platform = "Squarespace"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("drupal")) {
    platform = "Drupal"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("joomla")) {
    platform = "Joomla"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("laravel")) {
    platform = "Custom (Laravel)"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("nextjs")) {
    platform = "Custom (Next.js)"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("nuxt")) {
    platform = "Custom (Nuxt)"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("gatsby")) {
    platform = "Custom (Gatsby)"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("craft-cms")) {
    platform = "Craft CMS"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("typo3")) {
    platform = "TYPO3"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else if (signals.includes("wordpress") || wordpressApi) {
    platform = "WordPress (non-WooCommerce)"; confidence = "high"; fit = shop.cart || shop.productSchema ? "custom_or_feed_required" : "content_only";
  } else {
    fit = shop.cart || shop.productSchema || shop.offerSchema ? "custom_or_feed_required" : "content_only";
    confidence = "medium";
  }

  return {
    ...row,
    canonical_url: home.url,
    platform,
    confidence,
    commerce_fit: fit,
    evidence: uniq([...signals, ...probes, ...Object.entries(shop).filter(([,v])=>v).map(([k])=>k)]),
    checked_at: "2026-08-31",
  };
}

const results = new Array(rows.length);
let next = 0;
async function worker() {
  while (next < rows.length) {
    const i = next++;
    results[i] = await classify(rows[i]);
    process.stderr.write(`\rChecked ${results.filter(Boolean).length}/${rows.length}`);
  }
}
await Promise.all(Array.from({length: Math.min(CONCURRENCY, rows.length)}, worker));
process.stderr.write("\n");
process.stdout.write(JSON.stringify({
  checked_at: "2026-08-31",
  methodology: "First-party HTML, response headers/cookies, and bounded native endpoint probes. WooCommerce requires multiple active storefront signals or an active Store API plus a storefront signal; a WordPress/Woo asset alone is insufficient.",
  supported_native: ["WooCommerce","Shopify","Magento","Verskis"],
  rows: results,
}, null, 2) + "\n");

