# Studio V3 — Real timings, time-valid add-ons, cinematic videos

Three fixes, one pass. Aligned to the Studio philosophy (cinematic discovery, interface disappears, Portugal felt through atmosphere early, AI orchestrates not decorates).

## Today → target

| Area | Today | Target |
|---|---|---|
| Per-stop time | Not shown | "≈ 90 min" chip per stop |
| Drive between stops | Not computed | Real OSRM minutes per leg (cached) |
| Total day length | Free-text "7–9h" | Computed: pickup + stops + drives + add-ons |
| Over-budget guard | None | Soft warning vs. regional `dayLengthMinutes` / `maxDriveMinutes` |
| Add-ons | Filtered only by `minStops` / `minHours` | Each add-on dimmed/disabled if it would push the day past the regional rhythm |
| Cinematic selection | Static JPG behind every phase | Looped scene video that crossfades as the user chooses |
| /studio-v2 | Redirects, but lib stays | OSRM client moved to `src/lib/studio/`, v2 components left untouched (separate cleanup) |

---

## 1. Real timings

**New `src/lib/studio/timing.ts`** (client-safe pure utils):
- `stopDurationMinutes(stop)` — reads existing `duration_minutes` on `stopOperational` rows when present, with safe defaults per kind (winery 90, table 75, viewpoint 25, beach 60, workshop 90, heritage 60, market 45, cellar 75, village 40).
- `dayBudget(region, mode: "near"|"far")` — from `regionRules.ts`.
- `summarizeDay({ routePoints, legs, addOns })` → `{ totalExperienceMin, totalDriveMin, totalMin, overBudget, overDrive, warnings[] }`.

**Move OSRM client**: `src/lib/studio-v2/routing.server.ts` → `src/lib/studio/routing.server.ts`. Keeps the `builder_route_cache` table. Update the one V2 importer (server fn in V2 itinerary lib).

**New server fn** `src/lib/studio/timing.functions.ts` → `resolveStudioLegs({ stops: [{ key, lat, lng }] })`. Public, no auth (no PII).

**Wire-up**: In `LivingJourneyPanel.tsx`, after `resolveStudioV3Route` returns `routePoints`, call the server fn and merge `driveMinutesFromPrev` into each point. While OSRM resolves, use a haversine fallback so nothing blocks.

**UI**:
- `TimelineView.tsx` — per stop "≈ 90 min · tasting" chip, between stops a small "→ 22 min" drive chip, header total replaces the free-text label.
- `LivingJourneyPanel.tsx` — soft inline note when `overBudget`: *"A touch beyond the unhurried rhythm — we can trim a stop."*

## 2. Add-ons that fit the day

**`src/data/signatureAddOns.ts`**:
- Add `durationMinutes: number` to `SignatureAddOn`. Backfill each catalog item (tastings 60, workshops 90, table 75, viewpoints 25, cellar 75, picnic 90).
- Extend `selectSignatureAddOns({ …, remainingMinutes })` to return `{ addOn, fitsBudget }[]`.

**`SignaturePriceCard.tsx`**:
- Receives the day summary. Add-ons that don't fit render dimmed and non-toggleable with one quiet line *"Would extend the day past your rhythm."*
- Selecting a fitting add-on updates the live total; if the running total tips over, the ribbon shifts to gold-warning (no red — brand restraint).

## 3. Cinematic videos during selection

The interface disappears, Portugal arrives. Each choice swaps the canvas under the question.

**New `src/content/studio-scene-clips.ts`** — phase + answer → existing `public/video/scene-*.mp4` clip:

| Phase | Trigger | Clip |
|---|---|---|
| `feeling` | `relaxed_scenic` | `scene-coast-arrabida.mp4` |
| `feeling` | `elegant_cultural` | `scene-hidden-street.mp4` |
| `feeling` | `food_local` | `scene-local-table.mp4` |
| `feeling` | `social_celebratory` | `scene-celebration.mp4` |
| `feeling` | `romantic_intimate` | `scene-hidden-cove.mp4` |
| `feeling` | `coastal_cinematic` | `scene-arrabida-viewpoint.mp4` |
| `destination` | region picked | `scene-route-portugal.mp4` |
| `interests` | food/wine | `real/scene-taste.mp4` |
| `rhythm` | any | `real/scene-imagine.mp4` |
| `storyboard` enter | — | `real/scene-confirm.mp4` |

**New `src/components/studio-v3/AtmosphereCanvas.tsx`** — fixed video layer behind `PhaseShell`:
- `<video autoPlay muted loop playsInline preload="auto">` with `poster` = current JPG (SSR + slow-network safe).
- 700ms crossfade on `src` change.
- `prefers-reduced-motion` → falls back to current JPGs.
- Single element, reused across phases — no remount.

**`CreationBeat.tsx` / `AtmosphereBeat`** — keep the italic line, render over the live canvas with a ≤30% charcoal scrim for legibility.

**Performance**: one `<video>` at a time, all clips ≤4 MB; preload next phase's clip on `requestIdleCallback` when the current answer lands.

## Out of scope

Phase order/copy changes, Bokun, map redesign, new AI calls, V2 component deletion (separate cleanup), share-token URL changes.

## Verification

- `bunx tsc --noEmit`.
- Manual: pick each feeling → background video swaps; final timeline shows minute chips per stop and drive; toggle an add-on that doesn't fit → visibly dimmed with the rhythm message.
- Existing e2e (`studio-v3-*.spec.ts`) — none of the asserted strings/structure change.

## Order of work

1. `src/lib/studio/timing.ts` + move `routing.server.ts` + new server fn.
2. `durationMinutes` on add-ons; gate in `selectSignatureAddOns`.
3. Wire summary into `LivingJourneyPanel` → `TimelineView`.
4. Gate add-on toggles in `SignaturePriceCard`.
5. `AtmosphereCanvas` + `studio-scene-clips.ts` + integrate into `PhaseShell`.
6. Typecheck + tidy.

Estimate: ~6 new files, ~10 edits. No DB migrations. No new dependencies.
