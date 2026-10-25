# Project architecture decisions

- Public editorial motion starts in the committed SiteLayout, not the root shell, so lazy route HTML hydrates before any controller mutates it.

- All Studio inclusion surfaces and purchase payloads use composedDayInclusions on authoritative route labels; removed or closed activities cannot survive via catalogue fallbacks.
- Studio WhatsApp sharing contains an unconfirmed day summary without guest details; reservation confirmation messages remain restricted to verified paid sessions.

- Studio preflight admits actual composed routes through the existing timing and commercial payment authorities, not date-open products alone, so an eligible alternative cannot introduce a known checkout dead end.

- Corporate guest proof reuses the existing Viator review record and source link, never a separately maintained testimonial or an implied client case study.
- The booking request selector promotes the existing tour-specific instant booking route when a real tour is chosen; enquiry stays optional and payment logic stays in SimpleBookingForm.

- Travel Designer sample proof reuses TravelFilePreview and its original public pages immediately before the existing enquiry bridge, so sample browsing and conversion stay in one shared system.

- Public label-to-title spacing is owned by the shared editorial spacing tokens and existing section/scene contract; left-aligned page openings opt into public-page-header--start so headings and support share one reading axis without overriding centred pages.

- Travel Designer on-page enquiries reuse the public contact endpoint and contact_messages with request_type=multi_day; Conversions splits that category without double counting to preserve one durable enquiry pipeline.
- Service planning guides use the existing Local Stories registry and dynamic article route so headings, metadata, discovery and sitemap stay in one system.
- Local Story booking recommendations reuse GuideBookingCta and the existing tour catalogue; their registry controls chapter placement so each guide has one contextual booking card, not stacked competing actions.
- TourImage only calls decode() proactively for priority media; lazy images rely on onLoad so browser lazy-loading remains effective.

- `/studio`, `/portugal-travel-designer`, `/proposal-in-portugal` are canonical; legacy `/studio-v3`, `/multi-day`, `/proposals` 301 to them to keep inbound links without duplicate sitemap entries.
- P23 is reserve-as-designed; its Tailor link redirects to its tour page until venues are verified, to avoid unconfirmed changes.
- SEO title/description/H1 proposals live in admin-only drafts; published Signature search copy lives in the Signature SEO map, facts in verified tour content.
- WhatsApp reservation messages come only from a verified paid session on the confirmation page.
- Guest AI calls on Studio/Builder go through `allowAiCall`/`aiCallAllowed` (hashed-IP + daily caps) to bound cost.
- Per-stop photos come only from `tour_gallery_photos.stop_label` set in `/admin/photos`; curated stop images aren't proof of place.
- Route glance uses OSRM leg minutes (`useRouteLegMinutes`), never a summed driving total; stop order is narrative.
- Signature day recap before guest details reuses the tour page's verified itinerary/inclusions.
- External proof uses optional claim-adjacent EditorialSources; YES links stay primary.
- Guide scheduling uses DB conflict guards and RLS-safe RPCs; `/guide` is the only work list (3 tabs, scoped PWA manifest); access/assignment rules: see `src/components/guide/AGENTS.md`.
- Ops booking data rules: see `src/lib/ops/AGENTS.md`.
- Admin daily navigation is Operations, Bookings, Payments, Guides, More; legacy planning and tour-calendar URLs redirect to Operations because each booking has one full detail page and one shared canonical list.
- Conversion funnel counts only live-domain anonymous visits in `site_visits` (written by `/api/public/visit`, admin-only reads) plus live `cs_live_` paid bookings; one source keeps admin numbers free of preview/test noise.
- Guest portal = /itinerary via the paid Stripe session link; guest attendance/pickup/name edits live only in guest_portal_responses (never bookings or the frozen snapshot), and the 48h reminder rides the existing daily tour-day-before job, so booking logic stays untouched.
- Studio tour language travels with GuestDetails into the purchase snapshot; the paid webhook fills the existing operational booking language from that snapshot without overwriting later operations edits, keeping checkout and guide records aligned.
- Unfinished live checkouts: checkout.session.expired in stripe-webhook triggers one checkout-unfinished notice per session via /api/public/hooks/checkout-unfinished-email, linking back to the site (never a Stripe recovery URL) so availability and lead-time gates are rechecked.
- Studio Your Day reserve bar (YourDayReserveBar) renders via createPortal to document.body because the surface root entrance animation fill-mode keeps a transform that would trap position:fixed; it shows only while the in-flow primary CTA is off-screen and mirrors the same canReserve gate and onSecure handler, tracked via the reserve_bar_cta studio event.
