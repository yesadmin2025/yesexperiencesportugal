# Plan: Switch email sender domain to yesexperiences.pt

## Context
The current sender domain `notify.yesexperiencesportugal.com` is stuck in `provisioning_failed` because the DNS records for `yesexperiencesportugal.com` cannot be accessed at Squarespace/Google Domains. The user has an older domain, `yesexperiences.pt`, whose DNS they control, and wants to use it for sending emails.

## Goal
Move the project email sender domain from `yesexperiencesportugal.com` to `yesexperiences.pt`, complete DNS verification, and restore reliable guest confirmation / team notification delivery.

## Proposed steps
1. **Add workspace email domain for `yesexperiences.pt`**
   - Open the email domain setup dialog for `yesexperiences.pt`.
   - The user will delegate `notify.yesexperiences.pt` to Lovable-managed nameservers via TXT + NS records at their DNS provider.
2. **Verify DNS for `notify.yesexperiences.pt`**
   - Poll domain status until verification succeeds (`active` / `active_provisioning`).
3. **Switch the project email domain**
   - Update the project's active email domain to `yesexperiences.pt`.
4. **(Re)provision email infrastructure**
   - Run `setup_email_infra` to ensure pgmq queues, send log, suppression list, unsubscribe tokens, processor route, and cron job are configured for the new domain.
5. **Update sender configuration in code**
   - Change `SENDER_DOMAIN` / `FROM_DOMAIN` constants and templates from `notify.yesexperiencesportugal.com` to `notify.yesexperiences.pt`.
   - Keep the existing Resend fallback temporarily enabled but configured from the new domain; disable it once live sends succeed.
6. **Update custom domain / routing if needed**
   - If `yesexperiences.pt` should also redirect to the website, add it as a custom domain or alias. Otherwise it will only serve as the email sender brand.
7. **Drain the deferred email queue and test**
   - Re-send the parked Studio/booking confirmations to real guests.
   - Send a test email to a non-team address and confirm acceptance by the provider.
   - Verify team mirror emails still arrive at `yesexperiences@gmail.com` with the new sender.
8. **Communicate to the user**
   - Provide the exact DNS records they must add at their registrar.
   - Confirm when the switch is live and when the old domain can be removed.

## Notes
- No website/frontend redesign is required; this is an email infrastructure migration.
- Existing email templates and server routes remain in place; only sender domain constants change.
- The old `yesexperiencesportugal.com` domain and website continue to work for web traffic; only email sending moves to the new domain.

## Acceptance criteria
- `notify.yesexperiences.pt` is verified and active.
- Guest confirmation emails are accepted by the provider (no more rejections).
- Team mirrors include the full itinerary details as before.
- Parked deferred emails from the last 24–48 hours are delivered successfully.
