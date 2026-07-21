
## Goal
Verify that (a) Stripe checkout completes and the webhook records events, and (b) transactional emails (checkout receipt, welcome, internal booking notification) actually send after the recent domain/webhook fixes.

## Steps

1. **Snapshot current state** (read-only SQL):
   - `stripe_webhook_events` — last 20 rows, group by `stripe_env` + `event_type`, verify `checkout.session.completed` arriving on both live and sandbox.
   - `stripe_webhook_health_checks` — latest self-test rows per env.
   - `email_send_log` — last 20 rows, dedup by `message_id`, break out by `template_name` + `status`. Flag any `dlq`/`failed` with `error_message`.
   - `email_domain` status for `notify.yesexperiencesportugal.com` via `email_domain--check_email_domain_status` (confirms DNS active + queue processor healthy + auto-confirm not blocking).

2. **Run the admin self-test webhook** for both `live` and `sandbox` via the existing `/api/public/hooks/stripe-webhook-health` endpoint (same call the admin button makes). Confirm both return `ok:true` and a new row lands in `stripe_webhook_health_checks`.

3. **Trigger a real sandbox checkout end-to-end** using Playwright against `http://localhost:8080`:
   - Walk Studio V3 → Guest Details → Checkout Summary → Stripe hosted page.
   - Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, recipient email `qa+checkout-<timestamp>@yesexperiences.test`.
   - Capture screenshots at each phase.
   - After redirect back, re-query `stripe_webhook_events` for the new `checkout.session.completed` and `bookings` for the new row.

4. **Verify email dispatch** for that session id:
   - Query `email_send_log` filtered by `idempotency_key IN ('checkout-receipt-<sid>', 'welcome-<email>', 'internal-booking-<sid>-*')`.
   - Confirm each row transitions `pending → sent`, no `dlq`.
   - If any `suppressed`, inspect `suppressed_emails` for the recipient.

5. **Report** — one summary with:
   - Checkout: PASS/FAIL + session id + booking row id.
   - Webhook: live PASS/FAIL, sandbox PASS/FAIL, last verified event timestamps.
   - Emails: per template (checkout-receipt / welcome / internal-booking) status + latency + any error_message.
   - Blocking issues + concrete next fix if anything fails.

## Non-goals
- No code changes. Read-only diagnosis. If a real fix is needed, I'll come back with a follow-up plan.
- No production live-card charges — sandbox only.

## Notes
- Live Stripe env cannot be exercised safely without a real card; live health is verified via the signature self-test + inspection of any recent real `checkout.session.completed` events, not by placing a new live order.
