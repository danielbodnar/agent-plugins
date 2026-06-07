#!/usr/bin/env bun
/**
 * Provisions a per-slug Stripe Payment Link with Link enabled.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... bun scripts/stripe-provision.ts \
 *     --slug nealins-com \
 *     --business-name "Neal & Neal Insurance" \
 *     --client-email dan@nealins.com \
 *     --apex-domain nealins.com \
 *     --purchase-cents 199900 \
 *     --hosting-cents 9900
 *
 * Writes the resulting URLs to stdout as JSON.
 */

import Stripe from "stripe";

function arg(name: string, fallback?: string): string {
  const i = Bun.argv.indexOf(`--${name}`);
  if (i === -1 || !Bun.argv[i + 1]) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required flag: --${name}`);
  }
  return Bun.argv[i + 1];
}

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  console.error("STRIPE_SECRET_KEY env var required");
  process.exit(1);
}

const slug = arg("slug");
const businessName = arg("business-name");
const clientEmail = arg("client-email", "unknown@unknown");
const apexDomain = arg("apex-domain");
const purchaseCents = parseInt(arg("purchase-cents", "199900"), 10);
const hostingCents = parseInt(arg("hosting-cents", "9900"), 10);

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-12-18.acacia" });

async function main() {
  // One-time product: launch + 3 months hosting
  const launchProduct = await stripe.products.create({
    name: `${businessName}: Website launch + 3 months hosting`,
    description:
      `Launch of the ${businessName} redesign. Includes instant source-code download, domain switchover assistance, and 3 months of managed Cloudflare hosting.`,
    metadata: { slug, apex_domain: apexDomain },
  });

  const launchPrice = await stripe.prices.create({
    product: launchProduct.id,
    currency: "usd",
    unit_amount: purchaseCents,
  });

  // Monthly hosting subscription (shown as upsell, not on launch link)
  const hostingProduct = await stripe.products.create({
    name: `${businessName}: managed hosting (monthly)`,
    description: "Cloudflare-managed hosting, DNS, analytics, and support.",
    metadata: { slug, kind: "hosting_subscription" },
  });

  const hostingPrice = await stripe.prices.create({
    product: hostingProduct.id,
    currency: "usd",
    unit_amount: hostingCents,
    recurring: { interval: "month" },
  });

  // The primary Payment Link for the launch purchase.
  // Link (passwordless identity) is enabled by including 'link' in
  // payment_method_types on the underlying checkout session, which
  // Payment Links honor when payment_method_collection is set.
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: launchPrice.id, quantity: 1 }],
    payment_method_types: ["card", "link"],
    after_completion: {
      type: "redirect",
      redirect: {
        url: `https://${slug}.bitbuilder.cloud/purchased?session_id={CHECKOUT_SESSION_ID}`,
      },
    },
    metadata: { slug, client_email: clientEmail, domain: apexDomain },
    customer_creation: "always",
    billing_address_collection: "auto",
  });

  const output = {
    slug,
    launch_product_id: launchProduct.id,
    launch_price_id: launchPrice.id,
    hosting_product_id: hostingProduct.id,
    hosting_price_id: hostingPrice.id,
    payment_link_id: paymentLink.id,
    payment_link_url: paymentLink.url,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error("Stripe provisioning failed:", err);
  process.exit(1);
});
