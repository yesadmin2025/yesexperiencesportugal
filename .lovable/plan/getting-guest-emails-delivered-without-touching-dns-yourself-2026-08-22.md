# Getting guest emails delivered without touching DNS yourself

## Where things stand

Confirmed from the live send log: every email addressed to anyone other than `yesexperiences@gmail.com` is being rejected by the provider, because the branded sender `notify.yesexperiencesportugal.com` never finished DNS verification (it timed out) and mail is going out through a restricted temporary sender.

Your two site domains (`yesexperiencesportugal.com` and `www`) are connected and active, but in proxy mode through an external DNS provider — so the DNS zone is managed outside Lovable. That is the zone that needs the three email records.

## Recommended path: bring the domain's DNS under Lovable

Since you can't reach the DNS panel, the cleanest fix is to stop needing it:

**Transfer the domain into Lovable** (Workspace settings → Workspace domains). Once Lovable manages the domain, email setup creates the delegation for `notify.` automatically — no manual records, nothing for you to paste, and the site keeps serving exactly as it does now.

If a transfer isn't possible right away, the two alternatives are:

- Ask whoever set the domain up (agency, developer, or the registrar account holder) to add the three records — I can send them a ready-to-paste list.
- Move DNS hosting to a provider you control (Cloudflare free plan works); the registrar stays where it is.

I'll only need a decision from you here — the rest is on my side.

## What I'll do in the app in the meantime

So no guest is left without their information while the sender is still restricted:

1. **Guest-facing safety net.** After checkout, the confirmation screen already carries the full itinerary and PDF; I'll make the "your confirmation is on its way" wording honest and put the itinerary link and download front and centre, so the guest leaves with everything even if the email hasn't landed.
2. **Team copy stays complete.** Every guest email is already mirrored to `yesexperiences@gmail.com` and is being delivered. I'll make each mirror clearly state the intended recipient and include a one-tap mail link so you can forward it manually today.
3. **Nothing is lost.** Rejected messages are parked, so once the sender is verified I replay them all — including today's booking receipt, welcome, Studio design emails and the `info@` team alerts.

## After the domain is sorted

- Turn off the temporary fallback so all mail sends from the branded address.
- Replay every parked message.
- Run one Studio design and one test checkout and confirm the log shows `sent` for the guest and both team addresses.
- Point the automated test walker at a routable inbox so QA runs stop filling the log with rejections.

## Technical notes

- Fallback flag: `EMAIL_USE_RESEND_FALLBACK` in `src/lib/email/send-internal.server.ts` — removed once `notify.` verifies.
- Parked messages live in `email_deferred_sends`; replay via the existing `/api/public/hooks/email-flush` drain endpoint.
- Records still needed in the zone (for whoever can edit it): TXT `_lovable-email` = `lovable_email_verify=2a44769c7cacff566203e81d5f17cb80cf4fc75650a16f345af871c2993bcff2`, plus NS `notify` → `ns3.lovable.cloud` and `ns4.lovable.cloud`.
