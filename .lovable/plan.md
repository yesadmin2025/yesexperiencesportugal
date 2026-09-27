# Sharing each experience on social + US search boost

## 1. Sharing each experience (recommended approach)

A second copy of each tour page would split Google's attention between two near-identical pages and weaken both. Instead, the existing tour page becomes the share page:

- A quiet "Share this day" button on every Signature tour page (next to the price, and in the mobile reserve bar menu).
- On phones it opens the native share sheet (WhatsApp, Instagram, Messages, email). On desktop it offers WhatsApp, Facebook, email and Copy link.
- Shared links carry source tags (e.g. whatsapp / instagram / facebook) so GA4 shows which network brings visits and bookings.
- The link preview already shows the tour photo, full name and itinerary summary. Its description will also mention "From €X per person".
- The visitor lands on the real page with the itinerary, price by group size and "Reserve this day".

## 2. What Americans search (Semrush, US, monthly estimates)

| Theme | Search | Volume | Difficulty |
|---|---|---|---|
| Private days | lisbon tours | ~1,600 | — |
| Private days | day tours from lisbon | ~480 | — |
| Private days | private tours portugal | ~170 | Low (29) |
| Multi-day | portugal trip / vacation | ~1,600–1,900 | — |
| Multi-day | portugal itinerary | ~1,300 | — |
| Multi-day | portugal itinerary 10 days | ~880 | Low (18) |
| Multi-day | portugal trips packages | ~590 | — |
| Proposal | portugal / lisbon / porto proposal | ~50–70 each | Very low (5) |
| Corporate | corporate events / team building portugal | ~0–10 | — |
| Private driver | private driver portugal | ~20 | — |

Key finding: Americans search with trip words ("itinerary", "10 days", "trip"), not "travel designer". Corporate searches are almost nonexistent in the US, so that page stays as it is.

## 3. Pages to strengthen (copy and search info only, no layout or price changes)

- **Travel Designer**: add "Portugal itinerary", "10-day Portugal trip" and "private multi-day trip" wording in the title, description and one short section with 7-, 10- and 14-day example journeys. These are drawn only from our real regions and marked as starting points for a private journey.
- **Lisbon private tours / Experiences**: include "private day tours from Lisbon" and "private tours in Portugal" in the titles and opening lines. Add the differentiators: private car and local guide, instant online confirmation, free cancellation up to 24h.
- **Proposal in Portugal**: add "Lisbon proposal" and "where to propose in Portugal" as a short section with real locations we already offer. Add one FAQ answer.
- **Studio**: mention "design your own private day in Portugal and confirm instantly online" in the description.
- **FAQ**: add 2 US-style questions ("How many days do I need in Portugal?", "Can I book a private tour online with instant confirmation?").

## Technical notes
- Share button uses the Web Share API with a fallback menu; UTM params: utm_source={network}&utm_medium=social&utm_campaign=signature_share. Canonical stays the clean URL.
- No new routes, no sitemap changes, no changes to prices, booking, Stripe or tour facts.
- Changes stay in preview until you ask to publish.
