## Launch Polish — Batch 2

Four workstreams, sequenced for minimum risk. Approved image swaps land first (smallest diff, easiest to verify), motion/reveal work follows, map animation last (largest scope).

---

### 1. Approved image swaps

**Corporate (`src/routes/corporate.tsx`)**
- Card 3 ("quiet, considered, fully discreet") → `guests/arrabida-viewpoint-group.jpg`, alt rewritten to match (private viewpoint, small group, discreet)
- `og:image` → same `arrabida-viewpoint-group.jpg` (absolute URL) so social share matches the page's own hero character
- Confirm no lingering `estates.jpg` reference on this page (was the mismatch anchor)

**Multi-day (`src/routes/multi-day.tsx`)**
- Editorial hero-side image → `src/assets/multi-day.jpg` (primary) with `edit-coastal-road.jpg` as the mid-page editorial break
- Removes the triple-duplication of `estates.jpg` across Corporate / Proposal / Multi-day

**Out of scope this batch:** Proposal card 2 swap (`vineyard-couple.jpg`). Hold for a follow-up so we don't touch the proposal page in the same pass as everything else. PT mirrors updated only where the same import is reused.

Verification: read each file after edit, confirm imports resolve, screenshot Corporate + Multi-day at 393px.

---

### 2. Editorial card hover zoom (site-wide)

Currently only homepage editorial cards have the 1.02–1.04 hover zoom. Extend via the canonical primitive, not per-page CSS.

- Add a `hoverZoom` behavior to `<EditorialCard>` (default **on**) — wraps the image in `overflow-hidden` and applies `group-hover:scale-[1.03] transition-transform duration-[420ms] ease-out motion-reduce:transform-none` to the `<img>`
- Add the same treatment to `RelatedExperiencesRail` tour cards and any raw `<figure>` used as an editorial card on: About, Experiences, Corporate, Multi-day, Proposal-in-Portugal, Local Stories, Plan hub + destination pages
- Introduce a shared utility class `.editorial-zoom` in `styles.css` so one-off figures can opt in without prop drilling
- Reduced-motion respected via `motion-reduce`

Verification: Playwright hover on one card per page, screenshot before/after transform.

---

### 3. `.reveal` coverage audit

Confirm every section on Moments, Corporate, Travel Designer (`/multi-day`), Proposals uses `.reveal` (fade + translateY entry) on:
- Each `<section>` that is not the hero
- Editorial two-column blocks
- FAQ dl
- Related-experiences rail wrapper

Any missing section gets `className="reveal ..."` appended. No new keyframes — utility already exists in `styles.css`. Deliverable: 1-line diff per file + Playwright screenshot at scroll mid-page confirming staggered entry.

Out of scope: touching the hero (approved copy locked), the sticky CTA, or introducing per-child stagger beyond what `.reveal` already provides.

---

### 4. Plan destination map — route/link draw

`PlanningDestinationPage` currently has **no map**. Add one, in the spirit of `LiveMapPreview` / `EditorialMap`, so travellers see the geography of what they're planning.

**Placement:** new section between the editorial gallery strip and the featured Signature tours rail.

**Data model:** extend `PlanningDestination` with an optional `mapStops: { label: string; lat: number; lng: number }[]` field. Coordinates sourced from the existing `REGION_STOPS` catalog via `lookupStopGeo()` — **never invented**. If a destination has fewer than 2 resolvable stops, the section renders nothing (no map, no placeholder).

**Component:** new `PlanDestinationMap` built on `EditorialMap` (already handles real geo projection + editorial framing), with:
- Route polyline drawn between stops using the existing OSRM path from `useRouteLegMinutes` — real driving geometry, not a schematic S-curve
- Stroke-dashoffset animation on first reveal (2400ms, matches `LiveMapPreview` cadence)
- Per-leg distance label (km) + drive time (min) from `legDistancesKm` / `legMinutes` — realistic, source-of-truth
- Pins staggered 600ms apart, matching cadence in `LiveMapPreview`
- Reduced-motion: skip the draw, show the finished route

**No new dependencies.** Reuses `EditorialMap`, `useRouteLegMinutes`, `lookupStopGeo`, `REGION_STOPS`. Mapbox stays untouched.

Out of scope: interactive pan/zoom, Mapbox tiles on plan pages (would break the editorial rhythm), coordinates for destinations not in `REGION_STOPS` (those pages simply won't show a map until real stops are catalogued).

Verification: load one plan destination that has ≥2 catalogued stops, screenshot before/after draw, confirm leg minutes/km match the OSRM response.

---

### Sequencing & deliverables

1. §1 image swaps (fastest, isolates risk)
2. §3 `.reveal` sweep (mechanical, low-risk)
3. §2 hover-zoom primitive (design-system change, medium blast radius)
4. §4 Plan map (largest, most net-new code)

Between steps I'll stop, share screenshots + file diffs, and wait for approval before the next. Typecheck runs after each step.
