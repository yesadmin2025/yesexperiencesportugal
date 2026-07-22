# Semantic & Text Concatenation Fix Pass

Focused audit + surgical fixes. No visual, layout, copy, spacing, motion, or typography changes — only string separation, semantic HTML, and a11y attributes.

## Scope (in order)

1. **Homepage** (`src/routes/index.tsx` + `src/components/home/*`) — hero/section CTAs, card CTA pairs.
2. **Signature cards & pages** (`experiences.tsx`, `tours.$tourId.tsx`, `SignatureCard*`, `SimpleBookingForm`, `SimpleTailorForm`).
3. **Studio** (`studio-v3.tsx`, `components/builder/v3/*`, `components/studio-v2/*`, `components/studio-v3/*`).
4. **Tailor pages** (`tours.$tourId.tailor.tsx`, `SimpleTailorForm`).
5. **Checkout** (`checkout.$token.tsx`, `EmbeddedConfirmationSheet`, `HostHandoffPanel`).
6. **Contact / Moments / Corporate / Travel Designer** (`contact.tsx`, `moments.tsx` variants, `corporate.tsx`, `portugal-travel-designer.tsx`).

## Audit — what to grep for

Run these greps in each scope and record every hit before editing:

- **Adjacent CTAs without separator**: two `<CtaButton>`, `<a>`, or `<button>` siblings not wrapped in `<CtaPair>`.
  - `rg -nP '(</(CtaButton|Link|button|a)>)\s*(<(CtaButton|Link|button|a)\b)'`
- **Text glued to CTA/heading**: paragraph immediately followed by a link/button on same line with no whitespace, or JSX `{desc}<Button>` patterns.
  - `rg -nP '\}\s*<(button|a|Link|CtaButton)\b'`
- **Duplicate/repeated labels**: same visible label rendered twice in the same block (visible + sr-only siblings, "Add… Add", etc.).
- **Icon-only `<button>` without accessible name**: `<button` … `<Icon />` … `</button>` with no text child and no `aria-label`.
- **`<div onClick>` / `<span onClick>`** acting as controls (already found: `AmbientPrologue.tsx`, plus verify others).
- **`<input>` without associated `<label htmlFor>` or `aria-label`** — the `SimpleTailorForm` `<Field>` helper uses a wrapping `<label>` but the input has no `id`; verify all form fields.
- **Missing `autoComplete`** on `name`, `email`, `tel`, `date`, `given-name` inputs in `contact.tsx`, `SimpleBookingForm`, `HostHandoffPanel`, checkout.
- **`<form>` wrapper missing** where multiple inputs + a submit button exist (Enter key won't submit).
- **`type="button"` missing** on non-submit `<button>` inside forms (defaults to `submit` and can cause accidental submits).

## Fix rules (mechanical, no design change)

- Adjacent CTAs → wrap in existing `<CtaPair>` (already provides `aria-hidden` " · " separator) OR insert `{" "}` between them. Choose whichever keeps existing className exactly.
- `<div onClick>` → `<button type="button" className={same}>` with existing classes untouched; add `aria-label` if content is icon-only.
- Icon-only `<button>` → add `aria-label="…"` describing action; do not add visible text.
- `<input>` without label → add `id` + connect existing wrapping `<label>` via `htmlFor`, or add `aria-label`. Prefer `htmlFor` when a visible label exists.
- Description text glued to CTA → ensure a block-level element separates them (already true visually; add explicit whitespace in JSX where serialized output concatenates: `{description}{" "}<Cta>`).
- Add `autoComplete` to name/email/tel/date/postal inputs.
- Wrap orphan input groups in `<form onSubmit={…}>`; add `type="button"` to any non-submit buttons inside.
- Focus visibility: only add `focus-visible:outline` where currently missing on custom buttons — reuse existing `--gold` ring token; do not restyle.

## Files expected to change (from initial scan)

- `src/components/builder/v3/AmbientPrologue.tsx` — `<div onClick>` → `<button>`.
- `src/components/SimpleTailorForm.tsx` — associate `<label>`/`<input>` via `htmlFor`/`id`, add `autoComplete` where relevant, ensure notes textarea has an id.
- `src/components/SimpleBookingForm.tsx` — same audit (autocomplete, label association, form wrapper).
- `src/routes/contact.tsx` — autocomplete + label association + `<form>` if missing.
- Any homepage / experiences / studio / tailor / checkout / corporate / travel-designer file that shows adjacent CTAs without `<CtaPair>` or has icon-only buttons.

Exact final list is produced during the audit step (see Deliverables).

## Guardrails

- Do not touch: `src/styles.css`, `tailwind.config.*`, any file under `src/content/*`, hero copy, brand tokens, animation utilities.
- Do not rename or move existing classes; only add semantic attributes and swap element tags where required.
- No new components except `<CtaPair>` (already exists).
- Reduced-motion, brand palette, typography rules from memory remain untouched.

## Verification

- `bunx tsgo --noEmit` clean.
- `rg` for each pattern returns 0 hits inside audited scope.
- Manual: tab through each edited page — every interactive element reachable, focus ring visible, screen-reader label present (spot-check with browser devtools accessibility panel via Playwright).
- Visual regression sanity: `bunx playwright test e2e/homepage-typography-spacing-regression.spec.ts e2e/studio-v3-*mobile*.spec.ts` still pass (they lock layout & copy — proves no visual drift).

## Deliverables (posted in final reply)

1. **Corrected strings table**: `before → after` for every concatenation/duplicate-label fix.
2. **File → page map**: which route each fixed component appears on.
3. **Confirmation statement**: no layout, copy, or style tokens changed; only semantic HTML + a11y attributes + whitespace between adjacent CTAs.
4. **Test evidence**: tsgo clean + Playwright layout suites green.
