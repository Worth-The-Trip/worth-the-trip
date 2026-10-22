#!/usr/bin/env node
/**
 * Worth The Trip — Create Stripe Checkout Sessions for each guide
 *
 * Uses the Stripe test secret key to create Checkout sessions for one-time
 * guide purchases. Outputs session URLs that are pasted into
 * src/js/app.js (CONFIG.stripePaymentLinks).
 *
 * Run: node create-checkout-sessions.js > sessions.txt
 */

const stripe = require('stripe')(
  process.env.STRIPE_SECRET_KEY || 'sk_test_...replace-me...'
);
const fs = require('fs');

const guides = [
  { id: 'tokyo-city-explorer',    price: 499 },
  { id: 'kyoto-heritage-walk',    price: 599 },
  { id: 'osaka-food-crawl',       price: 399 },
  { id: 'sapporo-snow-nature',    price: 599 },
  { id: 'fuji-summit-hike',       price: 499 },
  { id: 'hakone-luxury-escape',   price: 999 },
  { id: 'hiroshima-miyajima',     price: 499 },
  { id: 'fukuoka-ramen-trail',    price: 399 },
  { id: 'nara-deer-temples',      price: 399 },
  { id: 'okinawa-beach-retreat',  price: 799 },
];

async function main() {
  const links = {};
  console.log('Creating Stripe Checkout sessions for 10 guides...\n');

  for (const guide of guides) {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'hosted',
      managed_payments: { enabled: false },
      mode: 'payment',
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      automatic_tax: { enabled: false },
      allow_promotion_codes: false,
      submit_type: 'auto',
      integration_identifier: 'hosted_mobile_app_0001',
      origin_context: 'mobile_app',
      success_url: 'https://worththetripapp.com/?session_id={CHECKOUT_SESSION_ID}&guide_id=' + encodeURIComponent(guide.id),
      cancel_url: 'https://worththetripapp.com/',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `${guide.id.replace(/-/g, ' ')} — Worth The Trip`,
              description: 'Japan travel guide by local experts',
            },
            unit_amount: guide.price,
          },
          quantity: 1,
        },
      ],
    });

    links[guide.id] = session.url;
    console.log(`${guide.id.padEnd(25)} ¥${guide.price}  →  ${session.url}`);
  }

  // ---- Unlock-all subscription session ----
  const unlockAllPriceId = process.env.UNLOCK_ALL_PRICE_ID || null;
  console.log(`\nCreating "Unlock all guides" subscription session using price: ${unlockAllPriceId || 'new inline subscription'}...`);

  const unlockSession = await stripe.checkout.sessions.create({
    ui_mode: 'hosted',
    managed_payments: { enabled: false },
    mode: 'subscription',
    success_url: 'https://worththetripapp.com/?unlock_all=1',
    cancel_url: 'https://worththetripapp.com/',
    line_items: unlockAllPriceId
      ? [{ price: unlockAllPriceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Unlock all guides — Worth The Trip',
                description: 'Unlocks every Worth The Trip guide',
              },
              recurring: { interval: 'month' },
              unit_amount: 499,
            },
            quantity: 1,
          },
        ],
  });

  console.log(`Unlock All  (subscription)  →  ${unlockSession.url}`);

  // ---- Write a single config file for the app ----
  const config = {
    stripePaymentLinks: links,
    stripeUnlockAllCheckoutUrl: unlockSession.url,
    unlockAllPriceId: process.env.UNLOCK_ALL_PRICE_ID || 'test-inline-subscription',
  };
  fs.writeFileSync('stripe-config.json', JSON.stringify(config, null, 2));
  console.log('\nWrote stripe-config.json');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
