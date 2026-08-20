# Itinerary polish, print view, and deeper Studio questions

Three related pieces of work: make the online itinerary page read cleanly on a phone, let guests print it as a proper document, and close the remaining gaps in what the Studio asks before a guest confirms.

## 1. Online itinerary page — mobile typography and PDF-matched hierarchy

The page currently renders correctly but its spacing scale was written independently from the PDF, and a few blocks can collide on narrow screens (long stop names next to the numbered badge, hairline rules sitting too close to the heading above them, long unbroken words such as place names or emails).

Changes, all inside `src/routes/itinerary.tsx` and a small scoped block in `src/styles.css`:

- Stop rows: switch the numbered badge from an absolute overlay to a two-column grid (`grid-cols-[28px_minmax(0,1fr)]`) so the number can never sit on top of a wrapped title. Add `min-w-0` and `break-words` to every text column.
- Align the badge to the first text line instead of the block top, so single-line and two-line stops both look intentional.
- Rules and headings: give each gold hairline consistent breathing room (heading, 12px, rule, 24px, content), matching the section rhythm used in the PDF.
- Facts grid: keep one column on mobile with a slightly larger row gap so label and value never crowd; two columns from `sm:`.
- Match the PDF's block order and relative weight exactly: header, facts, stops, Included, Add-ons, Adjusted for you, Your notes, flexibility note, sufficiency note, reference.
- Keep the existing brand tokens and type ramp (Fraunces headings, Inter body); no new colors.

## 2. Print-friendly itinerary

- Add a "Print itinerary" action beside the existing Download as PDF and Printable receipt links.
- Add a print stylesheet scoped to this page: hide the header, footer, floating actions, cookie bar and the action links; set black-on-white text; A4 margins.
- One stop per block: each stop gets `break-inside: avoid` so a title never separates from its note, mirroring the `keepWithNext` rule already used in the PDF builder.
- Print header shows the experience name, date, travelers, pickup and booking reference so a printed page is self-identifying.

## 3. Missing high-intent Studio questions

Faith and Workshops now exist as feelings and interests, but the adaptive refinement layer never asks a follow-up for faith, and a few high-intent details are only collected implicitly. Work:

- New adaptive branch: "faith" — asked only when the guest chose Faith & reflection and the resolved destination supports it (sanctuary and sacred-heritage routes). Options stay within real routes: time inside the sanctuary, the walk and the setting, or heritage over devotion. Each option maps to an existing Living Atlas signal or to null — no invented stops.
- Photography branch for guests who select Photography as a leading interest (golden-hour bias vs. landmarks vs. no preference), again mapped to existing signals only.
- Confirm-time completeness gate: before the Confirmation phase, the Studio checks that the answers the operations team needs are present — dietary/mobility considerations (or an explicit "nothing to mention"), hosting language, pickup, and any adaptive refinement that was relevant but skipped. Anything missing is asked inline as a short, cinematic step rather than blocking the guest at checkout.
- Every collected answer is carried into the booking snapshot and into both confirmation emails, so nothing the guest answered is lost.

## Guardrails

- No invented stops, suppliers, inclusions or prices. Adaptive options only reference experiences that already exist in the resolved Signature tour.
- No new fonts, colors or motion patterns; existing tokens and primitives only.
- Mobile first at 393px, then tablet and desktop.

## Technical notes

- `src/routes/itinerary.tsx` — layout, grid stop rows, print action.
- `src/styles.css` — `@media print` block scoped under a page-level class, plus a `.itinerary-stop` break rule.
- `src/components/studio-v3/adaptiveQuestions.ts` and `types.ts` — new refinement ids, relevance predicates, summary labels and signal mapping.
- `src/components/studio-v3/StudioV3.tsx` — completeness gate before `confirmation`, respecting the existing `PHASE_ORDER` and back-navigation rules.
- Tests: unit coverage for the new adaptive relevance and signal mapping, plus an integration check that the confirmation step is only reachable once required answers exist.
