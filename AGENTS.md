# Project architecture decisions

- `/studio`, `/portugal-travel-designer`, `/proposal-in-portugal` are canonical; legacy `/studio-v3`, `/multi-day`, `/proposals` 301 to them to keep inbound links without duplicate sitemap entries.
- P23 is reserve-as-designed; its Tailor link redirects to its tour page until venues are verified, to avoid unconfirmed changes.
- SEO title/description/H1 proposals live in admin-only drafts; published Signature search copy lives in the Signature SEO map, facts in verified tour content.
- WhatsApp reservation messages come only from a verified paid session on the confirmation page.
- Guest AI calls on Studio/Builder go through `allowAiCall`/`aiCallAllowed` (hashed-IP + daily caps) to bound cost.
- Per-stop photos come only from `tour_gallery_photos.stop_label` set in `/admin/photos`; curated stop images aren't proof of place.
- Route glance uses OSRM leg minutes (`useRouteLegMinutes`), never a summed driving total; stop order is narrative.
- Signature day recap before guest details reuses the tour page's verified itinerary/inclusions.
- External proof uses optional claim-adjacent EditorialSources; YES links stay primary.
- Guide scheduling uses DB conflict guards and RLS-safe RPCs; `/guide` is the only work list (3 tabs, scoped PWA manifest).
- Ops booking data rules: see `src/lib/ops/AGENTS.md`.
- Admin daily navigation is Operations, Bookings, Payments, Guides, More; legacy planning and tour-calendar URLs redirect to Operations because each booking has one full detail page and one shared canonical list.
- Guide App access labels come only from `src/lib/guide-access.ts`, and linking uses `guide_claim_account` (one active profile per confirmed email, unique email/user indexes); Admin and the Guide App describe access identically and no one can claim another profile.
- Guide assignments are final (no guide accept/decline); availability + DB clash guards are the decision point, and every new/updated/removed assignment writes one `ops_notifications` row that `dispatchGuideAssignmentEmails` emails once (claimed via `emailed_at`, keyed by notification id) so retries never duplicate.
