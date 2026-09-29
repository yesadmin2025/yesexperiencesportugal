# Project architecture decisions

- Keep `/studio`, `/portugal-travel-designer` and `/proposal-in-portugal` as canonical sales routes; legacy `/studio-v3`, `/multi-day` and `/proposals` issue direct permanent HTTP redirects so indexed inbound links retain their destination without duplicate sitemap entries.
- Keep P23 as a reserve-as-designed Signature and redirect its Tailor deep link to its tour page until workshop venues and alternatives are verified; this prevents suggesting unconfirmed itinerary changes.
- Store experience search title, description and H1 proposals in admin-only drafts, separate from published copy; this lets owners prepare edits without changing live tour facts or metadata.
- Compose WhatsApp reservation messages only from an already verified paid session on the confirmation page; this prevents sharing unverified booking details.
- Keep each published Signature search title, H1 and opening in the existing Signature SEO map, while leaving prices and itinerary in verified tour content; this separates search copy from operational facts.- Gate guest AI calls on public Studio/Builder through `allowAiCall`/`aiCallAllowed` (server-side hashed-IP + global daily caps), never client session IDs or sign-in only; this keeps personalisation for guests while bounding cost.

- Attach per-stop itinerary photos only from an explicit `tour_gallery_photos.stop_label` assignment made in `/admin/photos`; curated `tour.stops[].image` assets stay in the hero/gallery, because they are not guaranteed to be photos of that named place.
- Derive the tour-page route glance from real OSRM leg minutes (`useRouteLegMinutes`) and never sum them into a total driving claim; stop order in the SOT is narrative, not the driven sequence.
- Show the Signature day recap before guest details from the same verified public itinerary and inclusions used on the tour page; this keeps booking clarity without duplicating or inventing tour facts.
- Use optional claim-adjacent EditorialSources for external proof; keep YES links primary.
- Guide scheduling uses `tour_assignments`, database overlap protection, bookings as source of truth, RLS-safe guide RPCs, and one shared `MonthCalendar` selection-to-day-summary flow.
