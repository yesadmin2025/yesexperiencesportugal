## Problem

`STRIPE_LIVE_API_KEY` currently holds a `pk_live_…` (publishable) value. Publishable keys cannot create Checkout Sessions or PaymentIntents from the server, so live payments are effectively broken. This also explains why zero verified webhook events have arrived — no real live sessions are being created.

## Fix

### 1. Rotate `STRIPE_LIVE_API_KEY` to a real secret key
Open the secure secret form so you paste the correct value directly (I never see it).

Where to get it in Stripe:
- Stripe Dashboard → make sure the top-left toggle is on **Live mode** (not Test)
- Developers → API keys → **Standard keys** → **Secret key** → *Reveal live key*
- Copy the value that starts with `sk_live_…`
- Paste into the Lovable secure form when it opens

No code changes are needed — `src/routes/api/public/hooks/create-checkout.ts` and the webhook already read `STRIPE_LIVE_API_KEY` / `STRIPE_WEBHOOK_SECRET_LIVE`.

### 2. Confirm the live webhook endpoint in Stripe
Stripe Dashboard (Live mode) → Developers → Webhooks → your endpoint must be:

```
https://yesexperiencesportugal.com/api/public/hooks/stripe-webhook
```

Events subscribed must include at minimum:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

The **Signing secret** shown there must equal `STRIPE_WEBHOOK_SECRET_LIVE`. If it doesn't, click *Reveal* and update that secret too (I'll open its form in the same step if you confirm the value differs).

### 3. Re-verify end-to-end
After the key is updated:
1. In `/admin` → **Stripe webhooks** widget, toggle to **Live** and click **Testar webhook agora** — must show `verified=ok`.
2. Run a real €1 live checkout on a Signature tour.
3. Confirm in `/admin`:
   - **Reservas** — new row appears
   - **Stripe webhooks** — `checkout.session.completed` verified event logged
   - **Emails** — confirmation email row (`sent` once the domain DNS is Active; otherwise queued/Resend-fallback)

## Notes / safety
- Publishable keys (`pk_live_…`) belong only in `STRIPE_LIVE_PUBLISHABLE_KEY`; that secret is already set and correct.
- I will never ask you to paste the secret in chat — only via the secure form.
- No frontend, UI, or business-logic changes. Only one secret is being replaced.
