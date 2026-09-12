# Targeted push: "wine tour lisbon" / "lisbon wine tour" — 4 weeks

Written 13 Sep 2026. Owner: Nídia. Everything factual comes from the Signature
tour data; nothing here invents a stop, partner, price or review.

## Where we stand

| Search | Semrush volume (PT/EN) | Our page |
|---|---|---|
| wine tour lisbon | ~210 / month | `/lisbon-wine-tours` |
| lisbon wine tour | ~170 / month | `/lisbon-wine-tours` |
| best wine tours lisbon | ~0 (position 38) | redirects to the guide |
| private wine tour lisbon | low, high intent | `/lisbon-wine-tours` |

One hub currently carries every wine search on its own. That is the bottleneck:
Google has little else on this site to read as "this operator is the wine
authority near Lisbon".

## Structure (built, live this week)

```text
/lisbon-wine-tours                              ← the hub, target: wine tour lisbon
├── /lisbon-wine-tour-pickup-and-wineries       ← logistics + named cellars
├── /lisbon-wine-tour-prices-and-inclusions     ← prices, inclusions, cancellation
├── /tours/arrabida-wine-allinclusive           ← the product
├── /tours/azeitao-cheese
└── /tours/evora-alentejo
```

Hub links down to both supporting pages; each supporting page links back up and
sideways to the other. Proposals, `/lisbon-private-tours` and
`/day-trips-from-lisbon` link in with keyword anchors ("private wine tours from
Lisbon", "Lisbon wine tour pickup and wineries", "Lisbon wine tour prices").

## Week-by-week

**Week 1 — foundation (done)**
- Two supporting pages published with FAQ structured data.
- Keyword anchors added from Proposals, Lisbon hub and day-trips page.
- Sitemap regenerated (44 URLs) and resubmitted to Search Console.
- Ask Google to recrawl `/lisbon-wine-tours` and `/proposal-in-portugal` by
  hand in Search Console → URL Inspection → Request indexing. (This cannot be
  automated; the API has no such method.)

**Week 2 — the day itself**
- New Local Story: *An Arrábida wine day, hour by hour* — 08:30 pickup to
  evening return, real stops only. Links to hub + both supporting pages.
- Add a short "which wine day suits you" comparison block to the hub (Azeitão
  €101 · Arrábida €135 · Évora €169, drive time, lunch included or not).
- Add wine anchors from `/private-tours-azeitao`,
  `/private-tours-arrabida-sesimbra`, `/private-tours-evora`.

**Week 3 — the questions nobody answers**
- New Local Story: *Moscatel de Setúbal, explained before you taste it.*
- Extend hub FAQs to 8–10 questions taken from real guest emails (no invented
  ones), keeping the FAQ markup in sync.
- Internal links from `/faq` and `/portugal-for-american-travelers` into the
  wine hub.

**Week 4 — reach outside the site**
- Ask the two or three wineries we actually work with for a partner mention or
  link; we can supply the copy.
- Submit the Arrábida wine day to the Setúbal / Arrábida regional tourism
  listings and to two Lisbon expat guides that already rank for wine day trips.
- Add "wine tour from Lisbon" as a highlighted service on the Google Business
  Profile, with a post pointing at the hub.
- Re-check positions for both target searches and record them here.

## What moves the needle, honestly

Site structure and internal links are what we control, and they are now in
place. Beyond that, these two searches are won on links from other sites and on
time in the index — expect movement over 6–10 weeks, not days. Do not expect
the position-38 term ("best wine tours lisbon") to matter: it has effectively no
volume in Portugal.

## Manual steps only Nídia can do

1. Search Console → URL Inspection → Request indexing, for the four wine URLs
   and `/proposal-in-portugal`.
2. Upload `docs/seo/disavow-2026-09.txt` in the disavow tool.
3. Google Business Profile: add the wine service + one post per week.
4. Send the winery and listing outreach emails (drafts on request).
