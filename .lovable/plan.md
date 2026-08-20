# Email delivery validation — result and fix

## Validation result: emails are NOT reaching guests

I checked the live send log. Every message in the last 7 days that was addressed to anyone other than `yesexperiences@gmail.com` was rejected by the sending provider.

Latest real activity:

- 14:39 today — Studio design email to `nidiadealmeida85@gmail.com`: **rejected**
- 14:39 today — team lead alert to `info@yesexperiencesportugal.com`: **rejected**
- 12:04 today — booking receipt + welcome to `riotrecordsuk@hotmail.com`: **rejected**
- 12:04 today — team booking alert to `info@yesexperiencesportugal.com`: **rejected**
- Same messages mirrored to `yesexperiences@gmail.com`: **sent**

The rejection text is identical every time: the temporary fallback sender is in test mode and may only deliver to `yesexperiences@gmail.com`.

Root cause: DNS verification for the branded sender `notify.yesexperiencesportugal.com` never completed and timed out after 14 days, so all mail is going through the restricted temporary sender.

So: the app-side wiring is correct (every expected email is generated, logged, and enqueued at the right moment), but delivery to real recipients is blocked at the provider.

## Fix

### 1. Add the three DNS records (your action — nothing else can unblock this)

At your provider for `yesexperiencesportugal.com`:

| Type | Host | Value |
|------|------|-------|
| TXT | `_lovable-email` | `lovable_email_verify=2a44769c7cacff566203e81d5f17cb80cf4fc75650a16f345af871c2993bcff2` |
| NS | `notify` | `ns3.lovable.cloud` |
| NS | `notify` | `ns4.lovable.cloud` |

Then re-verify the domain in the backend email settings.

### 2. Switch off the temporary fallback

Once the branded domain verifies, remove the fallback flag so every message goes out from `notify.yesexperiencesportugal.com` to its real recipient.

### 3. Replay the messages that failed

Re-issue today's rejected mail with fresh idempotency keys: the two Studio design emails, the booking receipt and welcome to the booking guest, and the team alerts to `info@`.

### 4. Re-validate end to end

Run one Studio design and one test checkout, then confirm the send log shows `sent` for guest receipt, guest design email, and both team addresses — no rejections.

## Technical notes

- Fallback flag: `EMAIL_USE_RESEND_FALLBACK` in `src/lib/email/send-internal.server.ts`.
- Parked messages already exist in `email_deferred_sends`; replay uses the existing drain endpoint `/api/public/hooks/email-flush` plus fresh sends for anything not parked.
- Noise to ignore in the log: the `qa+studio@example.com` rejections at 02:00–04:00 are automated test runs, not real guests. Worth pointing the E2E walker at a routable test inbox so the log stays clean.
