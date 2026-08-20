&nbsp;

&nbsp;

Fix guest + team emails (Studio design and booking confirmation)

## What I found

The email wiring already fires correctly — the problem is delivery. The send log shows this morning's real activity:

- 06:37 — Studio design email to the guest (`alexrooke33@gmail.com`): **failed**
- 06:39 — Booking receipt to the guest (`riotrecordsuk@hotmail.com`): **failed**
- 06:39 — Welcome email to that guest: **failed**
- 06:39 — Team booking alert to `info@yesexperiencesportugal.com`: **failed**
- 06:39 — Team booking alert to `yesexperiences@gmail.com`: **sent**

Every failure carries the same provider error: the site is currently sending through a temporary Resend fallback that has no verified sending domain, so it is only allowed to deliver to `yesexperiences@gmail.com`. That is exactly why the guest received nothing and only one internal address did.

Underlying cause: the branded sender domain `notify.yesexperiencesportugal.com` never finished DNS verification (it timed out after 14 days), which is why the temporary fallback was switched on in the first place.

There is also one genuine gap in the code: when a guest enters their email in the Studio, the design email goes to the guest only. The YES team gets nothing unless the guest submits the separate "talk to us" lead form or completes a booking.

## The fix

### 1. Restore real deliverability (the blocker)

Finish DNS verification for the branded sender domain, then switch the temporary fallback off so all mail goes out from `notify.yesexperiencesportugal.com`. Three DNS records are needed at your domain provider for `yesexperiencesportugal.com`:

- TXT on `_lovable-email` with the verification value
- two NS records on `notify` pointing to `ns3.lovable.cloud` and `ns4.lovable.cloud`

I will give you the exact values to paste. Once the domain verifies, I remove the fallback flag and every guest and team address becomes deliverable. Until this is done, no code change can make emails reach guests.

&nbsp;

If it doesn't work, use the [Yesexperiences@gmail.com](mailto:Yesexperiences@gmail.com) address 

### 2. Send the team a copy of every Studio design

Add a team notification alongside the guest's design email, so the moment a traveller enters their email in the Studio you receive the same designed day (tour, date, guests, pickup, chapters, inclusions) even if they never book. Deduplicated per design revision so a guest re-typing their email does not spam the inbox.

### 3. Recover the emails that already failed

Re-issue the three failed messages for this morning's activity once sending works: the booking receipt and welcome to the booking guest, the team booking alert to `info@`, and the Studio design email to the traveller who designed but did not book.

### 4. Verify end to end

After the domain is live, run one Studio design and one test checkout and confirm in the send log that guest receipt, guest design email, and both team addresses all show `sent`.

## Technical notes

- Delivery blocker: `EMAIL_USE_RESEND_FALLBACK` in `src/lib/email/send-internal.server.ts`; remove once `notify.` is verified so the queue sends via the branded domain.
- New team copy: extend `sendSignatureStoryEmail` (`src/lib/emails/sendSignatureStoryEmail.functions.ts`) to also enqueue an internal template to `TEAM_NOTIFICATION_RECIPIENTS`, keyed `studio-design-<revision>-<recipient>`. Failures stay non-fatal so the Studio flow never breaks.
- Booking path (`stripe-webhook` → `/api/public/hooks/checkout-email`) needs no logic change; its failures were purely provider rejections.
- Replays are done through the existing internal send helper with fresh idempotency keys.