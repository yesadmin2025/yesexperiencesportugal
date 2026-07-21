Two Stripe credentials visible in the screenshots need to be stored securely so live payments and webhooks work end-to-end:

1. **New live signing secret** (`whsec_Zccyz8bhfJN8LSKIMCQEW2uzgHRuj4m7…`) from the "Yes Experiences" endpoint on `yesexperiencesportugal.com/functions/v1/stripe-webhook`.
2. **Full secret key** (`sk_live_51OCRvxDB0RPdsEWfvs1eC63vEs20…`) — replaces the current restricted key (`rk_live_…`) so all Stripe API calls (checkout, payment intents, receipts) work without permission errors.

## Steps

1. Update `STRIPE_WEBHOOK_SECRET_LIVE` → paste the new `whsec_Zccyz8bhf…` value.
2. Update `STRIPE_LIVE_API_KEY` → paste the new `sk_live_51OCRvx…` value (overrides the previous `rk_live_`).
3. Redeploy `stripe-webhook` and `stripe-session-status` edge functions so they pick up the new secrets.
4. Verify in `/admin`:
   - Webhook Health widget → **Verificar** → self-test should be green with the new secret.
   - `/admin/payments-env` → live account ping should show `chargesEnabled: true` and `payoutsEnabled: true` with the sk_live_ prefix.
5. In Stripe dashboard, click **"Send test webhook"** → `checkout.session.completed` → confirm it appears as last verified event in `/admin`.

## Security note

The screenshots contain live secrets. After I save them via the secrets tool, please **revoke and rotate both** in the Stripe dashboard (Developers → API keys → Roll; Webhooks → Roll signing secret) and then re-send new values — screenshots posted in chat are considered exposed. I'll re-save whichever new values you provide.

No code changes required unless the webhook function still fails after redeploy.
