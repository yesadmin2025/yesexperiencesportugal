## Goal

Clean up the two Signature screens so each has one job, one voice, and no clutter — while keeping every rule from the Studio bible (no invented stops, no configurator feel, price truth from Signature data).

---

## Screen 1 — Composer / route-forming screen (before Refine)

**Rename the primary CTA** that hands off into the Signature card.

- Current label reads "Preview signature" / "See my signature" (composer handoff).
- New label: **"Personalise a few details"** (primary)
  - Alt shortlist to confirm: "Adjust a few details" · "Refine my Signature" · "Fine-tune my day"
- Keep the secondary quiet link ("Save my signature" via WhatsApp) as-is — it's not part of this cleanup.

Wording change only. No layout or logic change on this screen.

---

## Screen 2 — Signature card (add-ons + refine) — hard declutter

### 2a. Two CTAs only, in this order

1. **Primary — "See my signature story"** → advances to the storytelling reveal (existing `onSecure`).
2. **Secondary — "Ask a curator for help"** (ghost button, opens the existing WhatsApp handoff with the composed journey title in the message body).

Remove everything else from the CTA stack on this screen:

- Remove the second/duplicate primary rendered by `SignaturePriceCard` (the inline "See my signature story" that duplicates the sticky one — keep only the sticky one on mobile, only the inline one on md+).
- Remove any "Save my signature" / "Save this signature" button here (Save lives only on the storytelling reveal, per existing pattern).
- Remove the trust strip micro-line under the CTA ("Nothing is booked yet — you'll confirm the full price on the next step") — the reassurance sentence above the CTA already covers it.
- Remove the "Real itinerary · Local designer review · Cancellation terms at checkout" chip strip on this screen (the reveal screen keeps its own trust cues).

### 2b. Price block — one number that changes, nothing else

Replace the current stack (From / per-pax hero / party total sub-line / "Drops to €X with 8+ guests" anchor / "See price for your group size" collapsible tier picker / italic disclaimers) with:

```text
[eyebrow]  For {N} guests
[hero]     €{perPax} / guest
[total]    €{partyTotal} total for your group
```

Rules for the block:

- Uses the guest count the traveller already picked earlier in the flow (`state.guests`). No group-size picker here, no "see price for larger group" affordance, no "drops to" hint.
- Both numbers **live-update** when add-ons are toggled (already wired via `partyTotalEur` / `displayPerPaxEur` — we just render fewer lines around them).
- If `state.guests` is missing, fall back to a single "€{perPax} / guest" line and no total (rare path — the composer sets guests).
- Keep the exact numeric source of truth (`priceEur`, `partyTotalEur`, add-ons) untouched — this is pure presentation.

### 2c. "Included" block — one tight list, no duplication

- Show the real `included[]` from the resolved Signature (already the source), capped at 4–5 items.
- Auto-append add-on labels the traveller has toggled on, at the bottom of the same list under a subtle "— Your additions" divider (per-line €amount kept, since it's what makes the total move).
- Drop the second inclusions paragraph / footnote / duration+moments meta chips that repeat what the storytelling screen will show.
- One header: `Included in your day` (replaces the longer "Included in your selected itinerary" here — the reveal keeps that phrasing).

### 2d. What we explicitly do NOT touch on this screen

- Add-on cards themselves (labels, prices, gating logic).
- Approval badge, journey title, refine accordion behaviour.
- Sticky CTA on mobile (kept — just made the single primary).

---

## Screen 3 — Storytelling reveal ("See my signature story") — accurate content

The story timeline currently lists **every** stop from the resolved Signature template. It must list only what the traveller actually kept.

In `FinalRevealStory.tsx`, change the `stops` source so it always uses the refined/kept set:

- Preferred source, in order:
  1. `state.editedRoutePoints` if present and non-empty (already the first branch).
  2. Otherwise, the subset of `tour.stops` whose keys/labels appear in `state.acceptedStops` (or whichever refine-state array holds the traveller's kept stops — verify against `useStudioState` and `StudioV3` refine handlers before wiring).
  3. Only if neither exists (deep-link edge case), fall back to `tour.stops`.
- Add-on beats stay appended after the kept stops, unchanged.
- No new copy, no invented stops, no reordering beyond what the traveller set.

CTA row on this screen stays as it already is:

- Primary: "Make this my story in Portugal" (advance to Guest Details).
- Secondary: "Save my signature".
- Tertiary text link: "Back to refine".

(That screen already matches the "two buttons + quiet back link" pattern the user wants — no change beyond the story-content fix.)

---

## Copy tokens to update

In `src/content/signature-day-copy.ts`:

- Add `CTA_PERSONALISE = "Personalise a few details"` (composer → refine handoff).
- Add `CTA_ASK_CURATOR = "Ask a curator for help"` (refine screen secondary).
- Add `INCLUDED_HEADER_REFINE = "Included in your day"` (refine screen only; reveal keeps `INCLUSION_HEADER`).
- Keep existing `CTA_PRIMARY`, `CTA_MAKE_STORY`, `CTA_SAVE_SIGNATURE`, `CTA_BACK_TO_REFINE` untouched.

---

## Files touched

- `src/content/signature-day-copy.ts` — add three tokens above.
- `src/components/studio-v3/StudioV3.tsx` — rename composer → refine CTA to `CTA_PERSONALISE`.
- `src/components/studio-v3/SignaturePriceCard.tsx` — collapse price block, prune trust strip + duplicate CTA + tier picker + "drops to" hint, add "Ask a curator for help" secondary, merge add-ons into the Included list, swap header.
- `src/components/studio-v3/FinalRevealStory.tsx` — restrict `stops` to the traveller's kept set.
- Tests to update (labels + count assertions), based on greps: `studio-v3-cta-labels-live.spec.ts`, `studio-v3-unified-signature-card.spec.ts`, `studio-v3-price-anchor-exit-intent.spec.ts`, `studio-v3-final-investment-live.spec.ts`, `price-source-of-truth.test.tsx`, `add-ons-gating-total.test.tsx`. Adjust expectations rather than adding new coverage.

## Out of scope

- Any change to pricing math, add-on catalogue, or Signature source data.
- Redesign of the storytelling reveal layout (only its data source is fixed).
- Copy on Guest Details / Checkout Summary screens.
- Adding QA overlays or screenshot-export tools (superseded by this cleanup).

## Verification

- Manual mobile viewport (393×588): composer CTA reads "Personalise a few details"; refine screen shows exactly two buttons and a single price/total pair that updates live with add-on toggles; storytelling reveal lists only kept stops + selected additions.
- `bunx vitest run` on the touched tests.
- Playwright: `studio-v3-cta-labels-live.spec.ts` and `studio-v3-unified-signature-card.spec.ts` re-run against the updated labels.
