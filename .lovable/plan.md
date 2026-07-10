Two small dev-only additions to the Preview/Refine Signature screen. Both are gated behind `?qa=1` (or `localStorage.YES_QA=1`) so they never ship to real users.

## 1. QA checklist overlay

A fixed, collapsible panel bottom-left of the Preview/Refine screen. Runs live DOM assertions and shows pass/fail with a colored dot.

Checks:
- ❌ "Why this works" block is absent (`[data-qa="why-this-works"]` not in DOM)
- ❌ "Often added" smart-suggestion card is absent (`[data-qa="often-added"]` not in DOM)
- ✅ Primary CTA exists with label `See my signature story` (via `[data-qa="primary-cta"]`)
- ✅ Primary CTA carries `data-total-eur` attribute (money preserved for tests, not shown to user)
- ✅ Secondary CTA is `Save this signature` (via `[data-qa="save-cta"]`)
- ❌ No CTA text contains `Reserve`, `SAY YES`, `REFINE WITH YES`, `NEED HELP` on this screen

Each row shows the rule + current state. Re-runs on route change and on a manual "Re-check" button. Zero prod impact — component returns `null` when the QA flag is off.

## 2. Screenshot export button

Small button in the same overlay: **Export screenshot**. Uses `html-to-image` (`toPng`) against the Preview/Refine root node, captures at the current CSS viewport (393×588 for you right now, at devicePixelRatio 3), and triggers a download as `preview-refine-<viewport>-<timestamp>.png`.

Notes:
- `html-to-image` is ~15 kB gz and works client-side; no server round-trip.
- Captures exactly what's on screen at real DPR, so it matches what you see in the preview.
- Add-only dependency; used only inside the QA overlay component so tree-shaking keeps it out of the main bundle for normal users.

## Files touched

- `src/components/studio-v3/QaOverlay.tsx` — new component (checks + export button)
- `src/components/studio-v3/StudioV3.tsx` — mount `<QaOverlay />` on the Preview/Refine screen only, add the `data-qa="*"` hooks to the two CTAs
- `src/components/studio-v3/SignaturePriceCard.tsx` — add `data-qa="primary-cta"` / `data-qa="save-cta"` to the buttons (no logic change)
- `package.json` — add `html-to-image`

Out of scope: changing any copy, layout, pricing, routing, or Playwright specs; adding the overlay to any screen other than Preview/Refine; wiring it into published builds.

## Approve to build

Reply "approve" and I'll implement. If you'd rather the export button live somewhere visible without the `?qa=1` flag, say so and I'll adjust.
