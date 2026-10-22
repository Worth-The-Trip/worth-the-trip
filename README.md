# Worth The Trip — Stripe Payments Integration

This directory contains the Stripe payments integration for Worth The Trip, a
Japan travel guide marketplace.

## What was set up

1. **Stripe Checkout sessions** for each guide (one-time purchase, delivered in tested test mode)
2. **Real Stripe URLs** in `src/js/app.js` (`CONFIG.stripePaymentLinks`)
3. **Webhook endpoint** (`server.js`) to receive payment confirmation events
4. **README.md** — this file

## Quick start

### 1. Start the local web server

```bash
npm start
```

This runs `server.js` on `http://localhost:8080`. The webhook endpoint is:

```
http://localhost:8080/webhooks/stripe
```

### 2. Create Stripe Checkout sessions (if you add new guides)

```bash
npm run create-sessions
```

This creates Checkout sessions for all guides in `guides.js` and prints the URLs.
Paste the URLs into `src/js/app.js` under `CONFIG.stripePaymentLinks`.

### 3. Register the webhook

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Add endpoint: `http://localhost:8080/webhooks/stripe`
3. Select events: `checkout.session.completed`
4. Save

### 4. Test a purchase

1. Open `http://localhost:8080` in a browser
2. Click a guide → "Unlock Guide"
3. Complete the payment with a test card: `4242 4242 4242 4242` (any expiry)
4. After payment, the page redirects back to the guide

## Files

| File | Purpose |
|---|---|
| `src/js/app.js` | Main app logic — updated `CONFIG.stripePaymentLinks` with real Stripe URLs |
| `src/js/stripe-config.js` | Generated Stripe URL config (used by the generation script) |
| `create-checkout-sessions.js` | Script that creates Checkout sessions for each guide |
| `server.js` | Express server — webhook endpoint |
| `package.json` | Node dependencies and scripts |
| `stripe-integration-plan.md` | The integration plan from `stripe_implementation_planner` |

## How the app uses Stripe

- The "Unlock Guide" button opens a **Stripe Checkout** hosted page
- On success, Stripe redirects back to the site with the purchase confirmation
- The webhook (`checkout.session.completed`) records the purchase
- The guide gets unlocked and the user can view the full itinerary

## Adding a new guide

1. Add the guide to `src/js/data/guides.js` (with `id`, `price` in cents)
2. Run `npm run create-sessions`
3. Paste the generated URLs into `src/js/app.js` (`CONFIG.stripePaymentLinks`)
4. Bump the `?v=N` on `app.js` script tag in `index.html`

## Testing in Stripe test mode

- Test card: `4242 4242 4242 4242` (any expiry/details)
- All test mode keys and session IDs start with `sk_test_` / `cs_test_`
- Never use test keys or session IDs in production

## Files that matter for payments

- `CONFIG.stripePaymentLinks` in `src/js/app.js` — the Stripe Checkout URLs
- `server.js` — webhook endpoint for recording purchases
- `create-checkout-sessions.js` — generates the URLs
