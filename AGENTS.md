# Project architecture decisions

- Keep `/studio` and `/portugal-travel-designer` as canonical sales routes; legacy `/studio-v3` and `/multi-day` issue direct permanent HTTP redirects so indexed inbound links retain their destination without duplicate sitemap entries.
- Keep P23 as a reserve-as-designed Signature and redirect its Tailor deep link to its tour page until workshop venues and alternatives are verified; this prevents suggesting unconfirmed itinerary changes.
- Store experience search title, description and H1 proposals in admin-only drafts, separate from published copy; this lets owners prepare edits without changing live tour facts or metadata.
- Compose WhatsApp reservation messages only from an already verified paid session on the confirmation page; this prevents sharing unverified booking details.
- Keep each published Signature search title, H1 and opening in the existing Signature SEO map, while leaving prices and itinerary in verified tour content; this separates search copy from operational facts.- Gate guest AI calls on public Studio/Builder through `allowAiCall`/`aiCallAllowed` (server-side hashed-IP + global daily caps), never client session IDs or sign-in only; this keeps personalisation for guests while bounding cost.
