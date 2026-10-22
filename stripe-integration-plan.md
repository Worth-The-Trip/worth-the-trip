# Stripe Integration Plan for Worth The Trip
# Generated via stripe_implementation_planner tool

BUSINESS_CONTEXT = {
    "name": "Worth The Trip",
    "url": "https://worththetripapp.com/",
    "description": "Japan travel guides made by local experts for foreign visitors",
    "products": ["Payments", "Billing"],
    "price_per_guide": 4.99,
    "currency": "usd",
    "platform": "Web app (map-first UI with zoomable Japan map)",
    "seller_type": "Single seller (not a marketplace)",
    "product_type": "Digital goods (travel guides)",
    "future_plans": ["Mobile app", "Flexible pricing", "Subscriptions"],
    "language_support": ["English", "Japanese (ja)"],
}

# The decision tree from stripe_implementation_planner confirmed:
# - No existing payment processor (Stripe only)
# - Payment surface: web browser
# - Product type: digital goods
# - Managed Payments: yes (digital goods only, eligible country)
# - Checkout style: full checkout embedded on site (no redirect)
# - Invoicing: no (standard checkout)
# - Payment links: no (custom checkout integration needed)

INTEGRATION_SHAPE = {
    "checkout_type": "embedded",
    "origin_context": "web",
    "payment_method": "Payment Intents",
    "checkout_ui": "Stripe Checkout (hosted) or Elements",
    "billing": "Stripe Billing (subscriptions, future)",
    "tax": "Stripe Tax",
    "extras": ["Dynamic Payment Methods", "Link", "Adaptive Pricing"]
}

print("=== STRIPE INTEGRATION PLAN ===")
print("Business: Worth The Trip (worththetripapp.com)")
print("Product: Digital Japan travel guides ($4.99/guide)")
print("Platform: Web app")
print("\nRECOMMENDED INTEGRATION:")
print("  - Payment Intents for one-time payments")
print("  - Stripe Checkout (hosted) or Elements for UI")
print("  - Stripe Tax for tax compliance")
print("  - Stripe Billing (future: subscriptions)")
print("\nKEY DECISIONS:")
print("  - Digital goods only, eligible for Managed Payments")
print("  - Embedded checkout (no redirect) for best UX")
print("  - Single seller (not Connect platform)")
print("\nAPI KEYS (test mode):")
print("  Publishable: pk_test_[REDACTED]")
print("  Secret: sk_test_[REDACTED]")
print("\nFRONTEND: Bump ?v=N on script tags after edits (Firefox caches aggressively)")
