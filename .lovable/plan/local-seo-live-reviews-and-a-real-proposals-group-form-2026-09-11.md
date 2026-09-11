# Local SEO, live reviews, and a real proposals/group form

Four asks, one pass. One of them I'd like to change slightly — details below.

## 1. Local copy for the nine service areas (adjusted approach)

The nine areas are Lisbon, Cascais, Sintra, Sesimbra, Setúbal, Azeitão, Évora,
Comporta and Tróia. Every one of them is already covered by a real page:

| Area | Page |
|---|---|
| Lisbon | /lisbon-private-tours, /day-trips-from-lisbon |
| Sintra, Cascais | /private-tours-sintra-cascais |
| Sesimbra | /private-tours-arrabida-sesimbra |
| Setúbal, Azeitão | /private-tours-azeitao-setubal |
| Évora | /private-tours-alentejo-evora |
| Comporta, Tróia | /private-tours-comporta-troia |

Building nine more pages would create near-duplicates of these, and Google
treats thin duplicates as a reason to rank *none* of them. Instead:

- Write a genuine local section on each existing page for every area it
  covers: what the area is, why guests go, pickup and drive time from
  Lisbon, best season, and which of our real days go there.
- Add an anchor per area (e.g. `#sintra`, `#cascais`) so each area has its
  own linkable, indexable destination and its own heading.
- Sharpen titles/descriptions toward "private tours in Sintra" and
  "day trips from Lisbon" where the page genuinely matches that search.
- Cross-link the areas from /day-trips-from-lisbon and the homepage.
- Regenerate and resubmit sitemap.xml after publishing.

If you'd still rather have nine standalone pages, say so and I'll build them —
I just don't want to weaken pages that are starting to rank.

## 2. Live reviews on the homepage and every region page

- One reusable reviews block driven by the same live data as /reviews
  (real verified guest reviews, no invented quotes).
- Homepage: a reviews section with the 4.9-star rating, review count and
  three real quotes.
- Each of the six region pages: the same block, filtered to reviews from
  the tours that actually run in that region, so testimonials match the page.
- Rating badge and structured data stay consistent with what's already live.

## 3. Real proposals and private-group form on the homepage

- A proper form section on the homepage: name, email, phone, type of
  occasion (proposal, celebration, corporate day, private group), preferred
  dates, group size, and what they have in mind.
- Submitting saves the request to the enquiries inbox (same place your
  other enquiries land, tagged so you can filter them).
- Two emails go out immediately: a branded confirmation to the sender, and
  a notification to info@yesexperiencesportugal.com and
  yesexperiences@gmail.com.
- Validated on the phone and on the server, mobile-first, with an inline
  success state rather than a page jump.

## 4. Google Business Profile

I can't sign in to your Google account, so I can't paste anything into the
profile or send review requests for you. What I'll do instead:

- Keep the info sheet exactly matched to the site (name, phone, hours,
  licence, service areas, booking link) so it's copy-paste ready.
- Give you the short click-path for each field, plus a ready-to-send review
  request message you can text or email past guests.

## Technical notes

- New shared components for the reviews block and the proposals form; region
  pages and the homepage consume them rather than duplicating markup.
- Form posts to a new public API route with Zod validation, writing to the
  existing enquiry table and reusing the existing email templates/registry.
- Sitemap regenerated via the existing generator script; no new route types.
- No change to pricing, checkout, inventory, hero copy, or product facts.
