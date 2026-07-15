## Audit findings

After scanning every Signature CTA that navigates to the Tailor route (`/tours/$tourId/tailor`), there are only **two customer-facing variants** left that don't already say "Tailor this day":

| File | Line | Current label | Surface | Destination |
|---|---|---|---|---|
| `src/routes/experiences.tsx` | 197 | `Make it yours` (aria: `Make {title} yours`) | Experiences listing card, secondary CTA | ✅ `/tours/$tourId/tailor` |
| `src/routes/pt.experiences.tsx` | 186 | `Personalizar` (aria: `Personalizar {title}`) | PT listing card, secondary CTA | ✅ `/tours/$tourId/tailor` |

Everywhere else is already aligned:
- `src/routes/index.tsx` (home Signature cards) → "Tailor this day" ✅
- `src/routes/tours.$tourId.tsx` (sticky mobile CTA + hero secondary, lines 331 & 928) → "Tailor this day" ✅
- `src/components/SimpleBookingForm.tsx` (booking form secondary link, line 331) → "Tailor this day" ✅
- `src/components/home/PathfinderQuiz.tsx` (recommendation card) → "Tailor this day" ✅
- Primary booking CTA on Signature pages → already "Check availability & reserve" ✅

## Explicitly out of scope (per your rules)
- `src/components/studio-v3/MapAwakens.tsx` "Personalise a few details" — **Studio surface**, keep.
- `src/routes/tours.$tourId.tailor.tsx` line 653 "I can adjust this tour a little…" — narrator prose inside the Tailor flow itself, not a CTA.
- `src/content/faq-data.ts` / `seo-faq.ts` question "Can I customise a Signature day?" — FAQ copy, not a button.
- `src/content/signature-day-copy.ts` `CTA_PERSONALISE` constant — only referenced by MapAwakens (Studio), leave the constant as-is.
- Data-file words like "personalized" inside Viator descriptions — content, not CTAs.
- Travel Designer / Corporate / Proposals / Instant booking / WhatsApp CTAs — untouched.

## Changes

### 1. `src/routes/experiences.tsx`
- Line 195 `aria-label`: `` `Make ${t.title} yours` `` → `` `Tailor ${t.title}` ``
- Line 197 label: `Make it yours` → `Tailor this day`
- Update the comment on lines 175–177 to reflect the new label.

### 2. `src/routes/pt.experiences.tsx`
- Line 184 `aria-label`: `` `Personalizar ${t.title}` `` → `` `Adaptar ${t.title} ao seu dia` ``
- Line 186 label: `Personalizar` → `Adaptar este dia` (PT equivalent of "Tailor this day"; the EN string would look out of place next to `Ver disponibilidade e reservar`).
  - If you'd prefer to keep the English string `Tailor this day` on the PT route for consistency, say so and I'll use that instead.

### 3. Verification
- Grep confirms no other Signature-context "Make it yours / Make this yours / Customise this experience / Adjust this tour / Personalise" CTAs remain.
- Manually click each changed button in the preview (EN `/experiences`, PT `/pt/experiences`) to confirm it opens `/tours/<id>/tailor` for the correct tour, preserves tour ID, and that the Tailor flow (already fixed in earlier turns) still restores adults + minor ages from context.
- Confirm the primary "Check availability & reserve" CTA on both listings and on the individual Signature page is unchanged.
- Analytics: no analytics event names are wired to these labels (searched — no `track(`/`gtag`/`analytics.` calls near these buttons), so no event renaming needed. If you have an external analytics layer keyed on button text, flag it and I'll add explicit `data-analytics-id="signature.tailor.cta"` attributes in the same edit.

## Deliverables after implementation
1. Files changed: `src/routes/experiences.tsx`, `src/routes/pt.experiences.tsx`.
2. Old labels found: `Make it yours` (EN listing), `Personalizar` (PT listing). No other variants present.
3. Final CTA by page: home / experiences / pt.experiences / individual tour / sticky mobile / booking form / Pathfinder → **secondary = "Tailor this day"** (PT: "Adaptar este dia"), **primary = "Check availability & reserve"** (PT: "Ver disponibilidade e reservar").
4. Destinations tested via preview click-through on both listing routes.
