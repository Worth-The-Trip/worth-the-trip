# STRIPE_INTEGRATION_TODO

Single source of truth for the remaining Stripe setup on Worth The Trip.
When the task is done, point the user here for all remaining steps.

---

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [create-checkout-sessions.js](create-checkout-sessions.js) (Stripe secret key on line 13)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| Stripe secret key (server) | «redacted:sk_test_…» | Use your own test key from Dashboard → Developers → API keys. |
| Stripe publishable key (frontend) | (see app.js CONFIG / stripe-config.js) | Use your own test publishable key (`pk_test_…`). |
| mode | payment | Keep `"payment"` for one-time guide purchases (not `"subscription"`). |
| success_url | https://worththetripapp.com/guide?session_id={CHECKOUT_SESSION_ID} | Your actual post-payment success page URL. Keep the `{CHECKOUT_SESSION_ID}` template. |
| cancel_url | https://worththetripapp.com/ | Your actual cancel/return page URL. |
| line_items[].price_data | unit_amount from `guide.price` (JPY) | Confirm the price still matches the product in the Dashboard, or switch to `price` (Price ID) if using Dashboard-managed prices. |
| ui_mode | hosted | `hosted` is correct for Stripe SDK `15.12.0` (below 21.0.0). If you upgrade the SDK above 21.0.0, change to `hosted_page`. |

## Configured Parameters

These parameters were configured per the integration spec and are set correctly in the code.

**File containing these parameters:**
- [create-checkout-sessions.js](create-checkout-sessions.js)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted |
| mode | payment |
| billing_address_collection | auto |
| phone_number_collection | { enabled: false } |
| automatic_tax | { enabled: false } |
| allow_promotion_codes | false |
| submit_type | auto |
| integration_identifier | hosted_mobile_app_0001 |
| origin_context | mobile_app |
| success_url | https://worththetripapp.com/guide?session_id={CHECKOUT_SESSION_ID} |
| cancel_url | https://worththetripapp.com/ |
| line_items | array with price_data (see Values to Replace) |

## Setup and Next Steps

### Environment variables
- Copy `.env.example` style keys into a `.env` file (or set them in your shell):
  - `STRIPE_PUBLISHABLE_KEY=pk_test_…`
  - `STRIPE_SECRET_KEY=sk_test_…`
  - `STRIPE_WEBHOOK_SECRET=whsec_…` (get from Dashboard → Developers → Webhooks)
- Naming: server-only vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) must **not** use the `VITE_` prefix. If you go through Vite, browser-accessible vars need the `VITE_` prefix.

### API keys
- Get live (test mode) keys from: https://dashboard.stripe.com/test/apikeys
- Keep keys out of source control; do not paste them into front-end files.

### Dependencies
- Already installed: `stripe` (`^15.12.0`), `express` (`^5.3.0`), `body-parser`.
- No additional packages required for this path.

### How the integration works
1. `create-checkout-sessions.js` runs on demand and creates one Stripe Checkout Session per guide via `stripe.checkout.sessions.create({ mode: 'payment', line_items: [{ price_data: {...} }], ... })`.
2. It logs the session URL (a hosted Stripe payment page) into `CONFIG.stripePaymentLinks` in `src/js/app.js` (via `update-app-stripe-config.js` or manual paste).
3. When the user taps **Unlock/Pay** on a guide card, the browser opens that Stripe-hosted page.
4. After successful payment, Stripe redirects back to `success_url` with the session id; `server.js` receives the `checkout.session.completed` webhook to update purchase state (currently logged only).

### Testing
- Test card (Stripe Checkout): `4242 4242 4242 4242` (any future expiry, any CVC).
- Test mode is active until you switch the Dashboard to live mode.
- The webhook secret in `server.js` is a placeholder (`whsec_TEST_webhook_secret_DO_NOT_USE_IN_PRODUCTION`); set a real one in `.env` and register the endpoint in the Dashboard.

### Known consequences of this change (review before going live)
- **`metadata` was removed** from the session per the integration spec. `server.js` currently reads `session.metadata?.guideId` and `session.metadata?.guidePrice` to map a purchase back to a guide. Without metadata, the webhook can no longer tell which guide was bought.
  - Recommended fix: restore `metadata: { guideId, guidePrice }` in the session call, or look up the guide by `session.line_items[0].price` at webhook time.
- **`payment_method_types: ['card']` was removed** per the spec. Stripe will now accept the default set of payment methods (including Apple Pay / Google Pay, where supported). If you want to restrict to cards only, re-add `payment_method_types: ['card']`.

### Next steps
- Confirm the success/cancel URLs match your real pages.
- Optionally enable Managed Payments / tax if you want Stripe to handle tax compliance (currently automatic_tax is disabled).
- Plan the subscription path later (Stripe Billing) via a separate `mode: 'subscription'` integration.

### Resources
- https://support.stripe.com
- https://docs.stripe.com/mcp
- Stripe Dashboard: https://dashboard.stripe.com/test
