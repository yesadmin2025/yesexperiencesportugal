
# Intent coverage panel (debug) + regression test

## 1. Intent coverage panel — in the existing debug overlay

Extend `src/components/studio-v3/StudioV3DebugOverlay.tsx` with a new collapsible **"Intent coverage"** section, rendered under the existing "Mount checklist". Visible only when the debug overlay is on (`?debug=studio` or Shift+D) — never shown to real guests.

Contents, for the currently resolved primary tour (`state.tourId`):

- **Header row** — tour id + region + total FitReport score.
- **Dominant intents** — `profile.dominant` from `tourIntentProfile` as small gold chips (up to 5).
- **All tags table** — every `StopIntent` present on the tour with its stop count.
- **Guest-interest coverage** — for each interest in `state.interests`, one row showing:
  - the interest label,
  - status pill: `strong` (gold) / `partial` (ivory) / `missing` (red),
  - the stop-label evidence (`profile.evidence[intent]` joined by ` · `),
  - the FitReport line's `satisfied` flag as a check/cross so the panel and scoring stay visibly in sync.
- **Top 3 candidates** — from `pickPrimaryTourWithFit(...).topReports`: tour id, `totalScore`, dominant intents, and a one-line list of satisfied vs missing interests. Lets us see at a glance why the chosen tour beat its neighbours.
- **Filtered** — any candidates the resolver dropped, with the reason string.

To surface `topReports` + `filtered` in the overlay without re-running the resolver, `StudioV3.tsx` already computes the primary pick — pipe the existing `pickPrimaryTourWithFit` result down as new props (`fit`, `topReports`, `filtered`) on `<StudioV3DebugOverlay>`. When those props are absent (e.g. before the guest reaches the reveal), the panel gracefully hides that sub-section and still renders the tag table from `state.tourId` alone.

No styling framework — reuse the existing inline styles for consistency with the current overlay. Copy is developer-only ("dominant", "strong", "missing") — no translation, no polish pass needed.

## 2. Regression test — every stop must be tagged

`src/components/studio-v3/__tests__/stop-intents.test.ts` already contains the assertion the user asked for:

> "every Signature stop has ≥1 tagged intent"

We reinforce it as an explicit, load-bearing guard so the request is clearly answered:

- Rename the test to **"REGRESSION: every Signature stop must have ≥1 intent tag"** with a comment block stating the intent (a new stop added without an entry in `TOUR_STOP_INTENTS` fails CI).
- Add a second regression: **"REGRESSION: TOUR_STOP_INTENTS has no orphan keys"** — every `${tourId} :: ${label}` in `TOUR_STOP_INTENTS` must correspond to a real stop in `signatureTours.ts`. Catches renames on the tour side that would silently drop tags.
- Add a third: **"REGRESSION: every tour has ≥1 dominant intent"** — guards against a tour whose stops all resolve to zero tags (would happen if someone deleted a tour's entry from `TOUR_STOP_INTENTS`).

All three run in the existing `stop-intents.test.ts` file — no new infra.

## Files touched

- `src/components/studio-v3/StudioV3DebugOverlay.tsx` — add Intent coverage panel + new optional props (`fit`, `topReports`, `filtered`).
- `src/components/studio-v3/StudioV3.tsx` — pass the existing FitReport result into the overlay.
- `src/components/studio-v3/__tests__/stop-intents.test.ts` — rename/reinforce the missing-tag test, add orphan-key test and dominant-intent test.

No changes to scoring, tag data, or guest-facing UI. One turn.
