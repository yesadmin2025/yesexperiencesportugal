# Three workstreams: content calendar, press outreach, mobile booking polish

You already have a lot of this. Below is what's genuinely missing, in build order.

## 1. Content calendar — "Lisbon day trips" + "Arrábida wine tour"

You already publish 15+ guides, including *Best day trips from Lisbon*, *Arrábida vs Sintra*, *Setúbal wine guide* and *Best wineries near Lisbon*. So the plan is **deepen and connect**, not flood the site with new posts.

Semrush (US market) demand behind this:

| Search phrase | Monthly searches | Realistic? |
|---|---|---|
| day trips from Lisbon Portugal | 1,600 | yes, with a stronger page |
| Lisbon tours | 1,600 | medium |
| Sintra day tour from Lisbon | 320 | you already rank 40 — closest win |
| Arrábida wine tour / wine tour from Lisbon | small but high intent | yes |

**Two hub pages** (the pages everything else links into):
- `/local-stories/best-day-trips-from-lisbon` — rebuilt as a real comparison hub: a sortable table of every day trip (drive time from Lisbon, best season, who it suits, price from), one honest paragraph each, and a link to the matching Signature day.
- A new Arrábida wine hub that pulls together the wine guides you already have, with a "which wine day is right for me" chooser.

**Four supporting pieces**, one every two weeks:
1. *Lisbon day trips by drive time* — 30 / 60 / 90 minutes out.
2. *Arrábida wine tour: what a day actually looks like* — hour by hour, real stops only.
3. *Best time of year for a Lisbon day trip* — month-by-month table.
4. *Day trip from Lisbon with kids / with limited mobility* — practical, answers questions nobody else answers.

**FAQ layer**: each hub and guide gets 5–8 real questions with short answers, marked up so Google can show them directly in results. Questions come from your inbox and from Semrush question data — nothing invented.

Everything links: guide → hub → Signature day → Studio.

## 2. Press kit and outreach

**Press kit page** at `/press` (public, linkable):
- Who YES is, licence number, founding story, the Sesimbra local angle.
- Downloadable photo set (your own images only) with usage terms.
- Fact sheet: regions covered, group sizes, languages, what makes the Studio different.
- Named contact and response time.

**Outreach plan** delivered as a working document, not code:
- A researched shortlist of ~25 real targets: Lisbon/Portugal travel blogs, expat sites, regional tourism guides, wine writers, and "things to do in Sesimbra/Setúbal" pages that already rank.
- For each: why they'd care, which of your guides fits, and the contact route.
- Three email templates (first contact, follow-up, journalist/press).
- A simple tracking table so you can see who replied.

I'll research the targets and verify each site is real and active. Sending the emails is yours — that has to come from you.

## 3. Studio booking on mobile

Already done and verified at phone width: card-first Stripe payment (no wallet detour), full-width payment card, instant confirmation, confirmation email on payment, and an admin bookings list at `/admin/bookings`.

So the remaining work is polish:
- **Payment step**: sticky price summary while the card form is on screen, clearer error text when a card is declined, and a spinner state so nobody double-taps "Book".
- **Confirmation email**: review the current one and make it a proper travel document — day, time, pickup point, what to bring, who to WhatsApp on the morning, and cancellation terms.
- **Bookings dashboard**: your admin list works but is dense. Rebuild the default view as today / upcoming / needs attention, with search by guest name and a one-tap phone and WhatsApp link — usable from your phone.

## Order I'd build in

1. Booking polish (protects revenue you're already taking)
2. Content hubs + FAQs (compounds slowly, so start it early)
3. Press kit page, then the outreach document

## Technical notes

- New guides go into `src/content/local-stories-articles.ts` and render through the existing `/local-stories/$slug` route — no new plumbing.
- FAQ markup uses the existing `src/content/seo-faq.ts` pattern and existing JSON-LD helpers in `src/lib/jsonld.ts`.
- `/press` is a new route with its own metadata; it joins the existing sitemap automatically.
- Booking dashboard changes stay inside `src/routes/admin.bookings.index.tsx`; no schema changes.
- Confirmation email edits go through the existing `enqueue_email` path — no new mail provider.
- No invented stops, partners, prices or testimonials anywhere.
