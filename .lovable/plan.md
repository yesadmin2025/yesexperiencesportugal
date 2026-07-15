# Fix 34 pre-existing test failures (10 files, 8 buckets)

These failures pre-date the Phase A composer work. Root cause pattern: intentional homepage/Studio/email edits over the last few sessions moved the code past the lock tests without updating (or exempting) those tests. Each bucket needs a small, targeted fix — no architectural changes.

For each bucket below the plan states resolution direction (fix code vs update test) and why. Anything I'm not sure about, I'll investigate at the start of the turn and adjust before editing.

## Bucket 1 — Brand tokens (9 failures) — `src/lib/brand-tokens.test.ts`

**Cause 1**: `styles.css` uses lowercase hex (`#1f1f1f`) but the lock expects uppercase (`#1F1F1F`) for 8 tokens (`--charcoal`, `--charcoal-deep`, `--gold`, `--gold-soft`, `--ivory`, `--sand`, `--teal`, `--teal-2`).
→ **Fix code**: normalize the 8 hex values in `src/styles.css` to uppercase. Preserves the lock's purpose (spot repointing) without weakening it.

**Cause 2**: 21 locked-hex leaks flagged in `src/lib/email-templates/*.tsx`.
→ **Fix test**: email templates legitimately need inline hex — CSS custom properties don't work in email clients (rule already noted in memory). Add `src/lib/email-templates/` to the test's exempt prefix list. Do NOT convert email templates to `var(--teal)`.

## Bucket 2 — Studio V3 progress stepper (8 failures)

Files: `progress-stepper.test.tsx`, `progress-stepper-a11y.test.tsx`, `progress-stepper-transitions.test.tsx`, `progress-stepper-visual.test.tsx`, `stepper-telemetry.test.tsx`.

**Cause**: the stepper's phase→beat map changed — `"occasion"` phase now maps to beat `"rhythm"` (tests expect `"region"`). Visual snapshots + label typography + a11y jump behavior all diverged with the same refactor.
→ **Investigate first**: read `StudioV3ProgressStepper` + tests to confirm the new order is the intended UX (very likely — Studio bible v6 pushed for the current beat order). If yes: **update tests + refresh snapshot** to match the current documented beat order. If the code drifted accidentally: revert the mapping.
→ Update `progress-stepper-visual.test.tsx` snapshot with `bunx vitest -u` scoped to that file only after confirming the DOM shape is intentional.

## Bucket 3 — Studio V3 reveal section order (3 failures) — `reveal-section-order.test.ts`

**Cause**: test expects a section id `studio-v3-hero-price` inside `StudioV3.tsx`; the current source no longer contains that id (returns -1).
→ **Investigate**: was the price surface renamed / merged into `studio-v3-signature-hero`? If merged intentionally, **update the test**'s expected id list. If accidentally removed, restore the id on the price block in `StudioV3.tsx`.

## Bucket 4 — Studio V3 route containment (1 failure) — `route-containment.test.ts`

**Cause**: `resolveStudioV3Route` returns a route point whose label isn't in the approved Signature/composition pool. Likely a stale label after recent composition changes (Phase A composer swap caps in `curation.ts` from earlier).
→ **Fix code**: find the offending label and either (a) drop that point from the resolver or (b) add its canonical label to the approved pool if it's a real stop that was missing. Test change only if the pool source of truth genuinely moved.

## Bucket 5 — Homepage typography scale (5 failures) — `homepage-typography-scale.test.ts`

**Cause**: `#studio-title`, `#final-cta-title`, `#signatures-title`, `#groups-title` H2s don't currently use the locked responsive ramp (`2.1→2.5→3.8rem` for conversion tier, `1.8→2.1→2.95rem` for editorial tier). Also `.he-eyebrow-bar` utility isn't applied on every major section eyebrow.
→ **Fix code** in `src/routes/index.tsx`: apply the correct locked class strings to those 4 H2s and add `.he-eyebrow-bar` to any section eyebrow missing it. This is the memory's "canonical UI primitives" rule — the lock is the source of truth.

## Bucket 6 — Homepage structure (4 failures) — `-homepage-structure.test.ts`

**Cause**: sections `#2 "Trust strip — reviews + private guide line"` and `#3 "Three paths — Day / Bespoke / Occasions"` are missing (or renamed) from the source; approved top-to-bottom order broken.
→ **Investigate**: recent homepage edits (guest moments / stock-photo replacement work) likely renamed section markers. Read `approved-homepage-structure.ts` (the lock spec) + `src/routes/index.tsx`. Restore the two missing section markers/comments so the source-lock finds them, without changing rendered content. This is a comment/id restoration, not a UI rewrite.

## Bucket 7 — Typography regression + FAQ typography lock (3 failures)

- `typography-regression.test.ts`: 2 obsolete snapshots for `[multi-day]` and `[proposals]` hero subheads.
→ **Update snapshots** (`vitest -u` scoped to that file) — recent proposal/multi-day animation work in earlier turns intentionally changed subhead class strings.

- `faq-typography-lock.test.ts`: FAQ `#faq-title` size/leading/tracking/color drifted from lock.
→ **Investigate then fix code** in FAQ component to restore locked class string; do not weaken the test.

## Bucket 8 — CTA band guardrail (1 failure) — `cta-band-guardrail.test.ts`

**Cause**: "Talk to a Local" appears 2× in `proposal-in-portugal.tsx` after this session's proposal-page premium-motion pass added a duplicate CTA band.
→ **Fix code**: remove the duplicated CTA in `proposal-in-portugal.tsx` (keep the single canonical final CTA). Do NOT add a `DUPLICATE_BAND_EXEMPTIONS` entry — a proposal page having two identical CTAs is a real duplication.

## Order of operations in the fix turn

1. Bucket 1 (brand tokens — trivial, unblocks styles.css confidence).
2. Bucket 8 (CTA dedupe — 1 line).
3. Bucket 5 + 6 (homepage — read `approved-homepage-structure.ts` first, then edit `src/routes/index.tsx` in one pass).
4. Bucket 7 (typography snapshots + FAQ lock).
5. Bucket 2 + 3 + 4 (Studio V3 stepper, reveal, route containment — read each test + source, decide direction, edit).
6. Re-run full suite. Target: 0 failures.

## Non-goals

- No behavior refactors. No new features. No design changes beyond restoring what the locks describe.
- No touching Phase A composer files.
- No `-u` snapshot bulk-refresh across the whole suite — only the two files explicitly listed above.

## Deliverables

- Green `bunx vitest run` (0 failed).
- Per-bucket 1-line summary in the final reply of what was fixed vs which tests were updated with the reason.
