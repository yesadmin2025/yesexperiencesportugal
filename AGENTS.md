# Project architecture decisions

- Keep `/studio` and `/portugal-travel-designer` as canonical sales routes; legacy `/studio-v3` and `/multi-day` issue direct permanent HTTP redirects so indexed inbound links retain their destination without duplicate sitemap entries.
- Keep P23 as a reserve-as-designed Signature and redirect its Tailor deep link to its tour page until workshop venues and alternatives are verified; this prevents suggesting unconfirmed itinerary changes.
- Store experience search title, description and H1 proposals in admin-only drafts, separate from published copy; this lets owners prepare edits without changing live tour facts or metadata.
- Compose WhatsApp reservation messages only from an already verified paid session on the confirmation page; this prevents sharing unverified booking details.