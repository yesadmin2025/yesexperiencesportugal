## 1. Structural issues found (current `/trade`)

- **Defensive / banned copy present**: "not a marketplace" (H2), "not a rebooked third party", "No call centre, no OTA queue", "One contact, on Lisbon time".
- **Geographically limiting copy**: hero and benefits imply US-advisor-only framing; services list names only Lisbon/Arrábida/Sintra/Alentejo/Vicentine Coast; FAQ 5 reveals internal supplier logic ("vetted partners for the regions we do not drive ourselves", "home base is Sesimbra, 40 minutes south of Lisbon").
- **Product naming**: service is titled "Multi-day journeys" instead of the official **Travel Designer**.
- **Spacing**: sections all use a flat `py-20`; benefit/service headings sit at `mt-3` from body with no rule; grid `gap-y-8` makes service rows visually merge; FAQ `space-y-6` + `pt-5` puts an open answer nearly touching the next question's border; form heading→paragraph→form gaps are uneven (`mt-3` / `mt-4` / `mt-10`).
- **Reading width**: hero paragraph is `max-w-2xl` centered (fine) but benefit and service body copy run the full grid column with no `max-w` ⇒ >75ch on large desktop.
- **Motion**: only `reveal` + `Scene` on hero; benefits, services and FAQ items have no `reveal-stagger`, so they appear all at once, unlike the rest of the site.
- **FAQ**: native `<details>` — no height transition (site standard is the Radix accordion used in `src/components/FAQ.tsx`), plus rotate-45 on a text "+" and a sub-44px touch target.
- **Form**: labels at 11px `--charcoal-soft` on sand = weak contrast; borders at `charcoal/25`; no per-field error state; `required` + `noValidate` shows only the first zod message at the bottom; entered values are preserved (uncontrolled form) — OK.
- **No proof section** and **no mid-page CTA** between services and FAQ.
- **No trade analytics**: only `gaGenerateLead` on success.
- Hero CTAs: currently one primary + one anchor; secondary "email a local designer" mailto missing.

## 2. Before → after copy

| Slot | Before | After |
|---|---|---|
| Hero eyebrow | For travel advisors & designers | FOR TRAVEL ADVISORS & DESIGNERS (unchanged wording) |
| Hero H1 | Portugal, designed with your *clients* in mind. | Your clients' Portugal, *designed and delivered locally.* |
| Hero body | "A direct partner… US travel advisors… reached in minutes, not days." | New supplied paragraph (trusted on-the-ground partner across Portugal…) |
| Hero CTAs | Request trade access / (anchor) | REQUEST TRADE ACCESS (primary) · EMAIL A LOCAL DESIGNER (ghost, mailto) |
| Why H2 | A working Portuguese operator — not a marketplace. | Local knowledge. *Portugal beyond the obvious.* |
| Benefit 1 | A real operator on the ground / "not a rebooked third party" | Portugal, known from the inside / supplied body |
| Benefit 2 | Bookable in real time | Designed around the client, not the circuit / supplied body |
| Benefit 3 | One contact, on Lisbon time | One local contact, from idea to travel / supplied body |
| Services H2 | Five ways your client can travel with us. | Five ways we can support *your clients in Portugal.* |
| Signature | "Twelve pre-designed private days across Lisbon, Arrábida…" | supplied body (no region list) |
| Studio | "A live design tool…" | supplied body (route, timings, price update in real time; reservable) |
| Multi-day journeys | title + "Custom 4–12 day…" | **Travel Designer** + supplied body |
| Moments | "quiet, cinematic setups run by our team with the guide" | supplied body |
| Corporate | "briefed and quoted directly with you" | supplied body |
| — | *(new)* | Travel Designer Book section (eyebrow/H2/2 paragraphs/CTAs as supplied) |
| FAQ H2 | Straight answers before you send us a client. | Clear answers before *you entrust us with a client.* |
| FAQ Q1 | "How do you work with US travel advisors?" + "Direct. You reach out…" | supplied Q/A |
| FAQ Q2 | keeps policy: trade terms on confirmed bookings, negotiated per relationship, not published | same policy, retoned: "Yes. We work on standard trade terms for confirmed bookings, agreed per relationship. Terms depend on volume, seasonality and whether you prefer net or commissionable pricing, so we discuss them directly rather than publish them." (no invented figures) |
| FAQ Q3 | "Not yet. …If you require consortium membership as a condition, tell us — we are open to conversations." | "No. YES Experiences Portugal is a licensed independent Portuguese operator and works directly with advisors and agencies. If consortium membership matters for your programme, tell us and we will discuss it." |
| FAQ Q4 | case-by-case wording | supplied body |
| FAQ Q5 | Sesimbra base + supplier disclosure | supplied body (operate across Portugal) |
| Form H2 | Tell us about your agency and your clients. | Tell us about your agency *and the clients you serve.* |
| Form body | "A named designer replies from Lisbon…" | supplied body (agency profile, typical client, support sought; reply within one business day) |
| Submit | Send trade inquiry | REQUEST TRADE ACCESS |

## 3. Spacing & hierarchy proposal

Site rhythm reused: sections `py-16 md:py-24`, alternating `--sand` / `--ivory`.

| Section | Padding | Internal rhythm |
|---|---|---|
| Hero | `pt-32 pb-16 md:pb-24`, sand | eyebrow → `mt-5` H1 → `gold-rule mt-6` → `mt-6` body (`max-w-[62ch] mx-auto`) → `mt-10` CTA row |
| Why partner | `py-16 md:py-24`, ivory | eyebrow → `mt-4` H2 (`max-w-[22ch]`) → `mt-12 md:mt-14` grid; items `gap-10 md:gap-12`, title → `mt-3` gold rule → `mt-3` body `max-w-[60ch]`, `items-start` for equal top alignment |
| Services | `py-16 md:py-24`, sand | header same; grid `gap-x-12 gap-y-10 md:gap-y-12`, each row `pt-6` under top border, title/arrow row → `mt-3` body `max-w-[58ch]`, `min-h` not forced (border-top keeps alignment) |
| Travel Designer Book | `py-16 md:py-24`, ivory | eyebrow → `mt-4` H2 → `mt-6` body → `mt-4` secondary line → `mt-8` preview → `mt-10` CTAs |
| FAQ | `py-16 md:py-24`, sand | header → `mt-10` accordion, items `space-y-3`, trigger `px-5 py-5` (≥44px), answer `pb-6 pt-0`, `pb-24` on section so the back-to-top / WhatsApp FABs never sit over an open answer |
| Form | `py-16 md:py-24`, ivory, `scroll-mt-28` | eyebrow → `mt-4` H2 → `mt-5` body (`max-w-[60ch]`) → `mt-10` form, fields `space-y-6`, submit `mt-10`, section `pb-28` on mobile to clear the WhatsApp FAB |

Body copy line-height standardised to `leading-[1.7]`; all paragraph blocks capped at 58–62ch.

## 4. Travel Designer Book placement & behaviour

- Placed **after the five services, before the Trade FAQ**, on `--ivory`.
- Reuses the existing approved sample file already live on `/multi-day`: `/travel-file-sample/page-01..23.jpg` (anonymised sample already public) plus the same border/shadow/`cursor-zoom-in` treatment.
- The current `/multi-day` block is extracted into a shared component `src/components/travel-designer/TravelFilePreview.tsx` so both pages render identical design language; `/multi-day` keeps its current appearance and copy (no visual change there).
- Behaviour: large cover + manual-nav strip of internal spreads, prev/next buttons and keyboard arrows, discreet "03 / 23" progress, no autoplay, no flip/3D. Opening a spread uses a simple lightbox overlay (esc/backdrop close, focus trap). All images `loading="lazy"` + fixed aspect box so nothing shifts.
- No downloadable client PDF; CTAs are **VIEW A SAMPLE JOURNEY** (opens preview / scrolls to it) and **REQUEST A TRAVEL BOOK SAMPLE** (ghost → `#trade-inquiry`, prefills nothing personal). This is also the mid-page trade CTA required by the conversion flow.
- Crossfade transitions ~300ms ease-out, disabled under `prefers-reduced-motion`.

## 5. Files to be changed

- `src/routes/trade.tsx` — full copy + structure + spacing + accordion + form + analytics rewrite.
- `src/components/travel-designer/TravelFilePreview.tsx` — **new**, extracted/shared book preview.
- `src/routes/multi-day.tsx` — swap the inline sample-file markup for the shared component (visual output unchanged).
- `src/lib/analytics-events.ts` — add the nine `trade_*` / `sample_journey_view` / `travel_book_sample_request` names to the `YesAnalyticsEvent` union (no PII sent; only placement/step params).
- `docs/analytics/events.md` — document the new trade events.
- `e2e/trade-structure.spec.ts` — **new**: hero copy, banned-phrase check, five services present, accordion opens, form validation + success state, no horizontal scroll at 360/393/768/1280/1728.

## Technical notes

- FAQ moves from `<details>` to the project's Radix `Accordion` (`type="single" collapsible`), matching `src/components/FAQ.tsx`; the FAQ JSON-LD keeps rendering from the same `FAQS` array.
- Motion reuses `Scene` + `.scene-title/.scene-body/.scene-cta` and `.reveal-stagger`; no new motion primitives.
- Form gains per-field error state (zod issue mapped to field name), `aria-invalid`/`aria-describedby`, darker labels (`--charcoal`) and `border-charcoal/40`; the endpoint (`/api/public/contact`, `source: "trade"`) and success handling are unchanged.
- No publish; changes land in preview only.
