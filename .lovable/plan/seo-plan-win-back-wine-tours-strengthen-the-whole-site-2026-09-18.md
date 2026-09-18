# SEO plan: win back wine tours, strengthen the whole site

## What the data says (Semrush, US database + your tracking report)

- Your tracked visibility fell from 21% to 11% in one week; only 4 tracked keywords rank at all.
- "best wine tours lisbon" is now at position 42 (was page 1).
- In the US market Semrush sees only 11 ranking keywords and no page reaching page 1 except brand searches ("yes portugal", position 8).
- Pages that do rank are all Local Stories articles (Sintra day tour, Sesimbra, coastal drives) — not the pages that sell.
- Wine demand in the US is small per keyword (wine tours lisbon ~50/mo, lisbon wine tasting ~30/mo, arrábida/setúbal wine ~20/mo each) but low difficulty. The winning move is to own the whole wine cluster, not one phrase.

## Root cause to fix first (this is the likely reason for the fall)

You have around 10 separate wine pages competing with each other for almost the same searches: `best-wine-tours-from-lisbon`, `wine-tours-lisbon`, `private-wine-tour-lisbon`, `portugal-wine-tours`, `best-wine-regions-near-lisbon`, `best-wineries-near-lisbon`, `setubal-wine-guide`, `arrabida-wine-tour`, `arrabida-vs-alentejo`, `is-a-wine-tour-from-lisbon-worth-it`. Google keeps swapping which one it shows, so none of them builds authority. That pattern matches a page-1 position collapsing to 42.

The fix is consolidation, not more pages.

## The plan

### 1. One wine authority page
Make `/local-stories/best-wine-tours-from-lisbon` the single wine hub: expand it into the definitive American-traveller guide to private wine days from Lisbon (Arrábida, Azeitão, Setúbal, Alentejo side by side), with prices, durations, pickup, what a private day includes, and a clear "Reserve this day" path to each Signature. Only real facts already in the project.

### 2. Retire the overlap
Keep the genuinely distinct articles (Setúbal, Azeitão, Alentejo comparison) but reframe each to one narrow angle, point their main wine intent at the hub, and remove duplicate paragraphs. Fold the weakest, most overlapping ones into the hub with 301 redirects so their value transfers instead of competing.

### 3. Make the money pages rank
The Signature experience pages (Arrábida Wine, Azeitão Cheese & Wine, Évora & Alentejo) get American-English titles and descriptions built around booking intent ("private wine tour from Lisbon", "book a private day"), plus complete structured data (experience, price, rating where real, itinerary, breadcrumbs, FAQ) so Google can show price and stars.

### 4. American-market language pass
Titles and descriptions across homepage, /experiences, wine cluster and Signature pages rewritten for how Americans search: "from Lisbon", "private day tour", "small group vs private", "pickup at your hotel", USD-friendly framing without changing prices.

### 5. Technical follow-through
Verify every kept page is canonical, indexable, in the sitemap with a sensible priority, and internally linked from the homepage, /experiences and the wine hub. Remove index signals from thin or duplicate pages. Keep the 301s already in place working.

### 6. Measurement
Add a short SEO checklist doc and a regression test set so future edits cannot silently break titles, canonicals, sitemap coverage or schema.

## What will not change

Prices, tour facts, itineraries, inclusions, reviews, routes that customers use, booking and payment logic, Studio behaviour, database, brand design and typography.

## Technical notes

- Wine cluster lives in `src/content/local-stories-articles.ts`; top-level wine routes are already 301 wrappers in `src/routes/*.tsx`.
- Signature detail SEO is in `src/routes/tours.$tourId.tsx` head() plus its JSON-LD builders.
- Sitemap is generated in `src/routes/sitemap[.]xml.ts` (108 URLs today) — regenerate after consolidation so redirected slugs drop out.
- Redirects use `throw redirect({ statusCode: 301 })`, matching existing wrappers.
- New tests under `src/__tests__/` for canonical/sitemap/schema coverage of the wine cluster.
- Validation at 393×852 and 1280×900, typecheck, focused tests, production build. No publish until you approve.

## Expected outcome

Realistic goal: wine hub back into the top 10 for "wine tours lisbon" / "best wine tours lisbon" and the Signature wine pages ranking for booking phrases, within a few weeks of Google recrawling. Consolidation usually shows movement faster than new content.
