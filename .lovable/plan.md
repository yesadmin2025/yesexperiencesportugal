# Mobile performance audit — homepage (no changes)

## Baseline

Hero is already carefully tuned: `CinematicHero` serves a 720p clip (~866 KB) to phones and 1080p (~2.6 MB) to desktop, with responsive WebP posters, `preload="none"`, autoplay muted+playsInline, and the `<video>` mounts on idle so it never races the LCP poster paint. Data-Saver is honored. That is the healthy part — nothing to change there.

The risks below are around it, not inside it.

## 1. Likely bottlenecks

**A. Orphan 19 MB hero master (P1, cheap).** `public/video/hero-sunset-road.mp4` (19,207,432 B) sits in the bundle. Nothing on the homepage references it (only `.asset.json` + the 720/1080 renditions are used by `CinematicHero`). It ships with the deploy and shows up in any bulk asset listing / crawler prefetch experiment.

**B. 117 MB of unused film clips in `public/`.** `public/video/film` = 96 MB, `public/video/real` = 21 MB. `hero-scenes-manifest.ts` references `/video/film/yes-hero-film-{720,1080}.mp4` but the homepage renders `CinematicHero` (sunset-road), not the manifest film. The scene clips under `public/video/scene-*.mp4` and `public/video/real/scene-*.mp4` are referenced by Studio/Builder, not the homepage. All of this is served from the origin — a crawler, prefetch, or a stale route can still fetch it.

**C. Poster is JPG at the `<img>` fallback layer (P2).** `CinematicHero` correctly uses `<picture>` with mobile/desktop WebP sources, but the `<img>` element itself points at `posterJpg` (80 KB) instead of the 33 KB `hero-sunset-road-poster-720.webp` — browsers that don't take the `<source>` (older Safari data-saver, some in-app WebViews) download the 80 KB JPG for the LCP. Not a disaster, but the LCP candidate should be the smallest asset.

**D. Below-the-fold `<img>` lazy coverage (P2).** Only 2 of the homepage-scope `<img>` tags carry `loading="lazy"` / explicit `decoding="async"`. Cards, occasion tiles, and editorial images below the hero should all be lazy + async-decoded on mobile.

**E. Oversized bundled assets (P2).**
- `src/assets/decision-signature.jpg` — **1.26 MB**, single JPG, no responsive variants.
- `src/assets/yes-mark-refined.png` — 863 KB (logo shouldn't be >20 KB; convert to SVG or 2× WebP).
- `src/assets/yes-logo-approved.png` — 664 KB (same).
- ~12 tour hero JPGs in the 350–480 KB range with no AVIF/WebP siblings and no `srcset` for mobile widths.

**F. Video format = MP4/H.264 only (P3).** No AV1 or HEVC/H.265 alternates. On modern iOS/Android an HEVC or AV1 sibling would cut the 720p clip from ~860 KB toward ~450 KB at equal quality. Additive, no risk to current playback.

**G. Animation weight (P3, not urgent).** Homepage uses ~16 `reveal`/`transition` triggers, all already scoped to `.home-energy` and honoring `prefers-reduced-motion`. No layout thrash observed in the source. Keep as-is; only flag if Lighthouse TBT regresses. Do NOT strip premium animations without evidence.

**H. Carousels.** No autoplay carousels detected on the homepage — brand rule already forbids them. Nothing to fix.

**I. Render-blocking / script overhead.** Global scripts come from `__root.tsx` (JSON-LD Organization/WebSite — inline, non-blocking) and route bundles. No third-party analytics/chat/pixel scripts inlined at the head level from what's visible. Worth a one-pass sweep of `<script>` tags in `__root.tsx` and any injected loaders (GTM/Bokun) to confirm they're `async`/`defer` and gated.

## 2. Recommended low-risk optimizations

| # | Fix | Risk | Est. mobile impact |
|---|---|---|---|
| 1 | Delete `public/video/hero-sunset-road.mp4` (unused 19 MB master) and any `public/video/film/*` + `public/video/real/*` that no live route references. Keep the 720/1080 renditions and posters. | Very low — grep-verify zero references first | Deploy size ↓ ~130 MB; no runtime change on homepage but faster edge cache warm-up + fewer stale prefetches |
| 2 | Point `<img>` inside the poster `<picture>` at `hero-sunset-road-poster-720.webp` (33 KB) instead of the 80 KB JPG. Keep the JPG only as `type="image/jpeg"` `<source>` for legacy fallback. | Very low, visual identical | LCP ↓ ~40–60 KB on mobile |
| 3 | Add `loading="lazy" decoding="async"` (and, where sensible, `fetchpriority="low"`) to every below-the-fold `<img>` in homepage sections. Exempt only the LCP. | Very low | Reduces first-viewport transfer; helps INP/TBT |
| 4 | Compress `decision-signature.jpg` to ~180 KB WebP + generate 640/960/1440 responsive variants via `vite-imagetools`; convert the two 600–860 KB PNG "logo" assets to SVG (or 2× WebP). | Low | ~2 MB of unnecessary bytes gone from cards below the fold |
| 5 | Generate AV1 or HEVC siblings for `hero-sunset-road-720.mp4` and add as first `<source>` with `type="video/mp4; codecs=hvc1"` / `video/av01`. Keep the current MP4/H.264 as fallback. | Low, additive | Hero clip ↓ ~40–50% on modern iOS/Android |
| 6 | Confirm any Bokun / analytics / social embeds are `async` `defer`, gated to interaction or `requestIdleCallback`, and not present in `__root.tsx` head. | Very low | Cuts main-thread work on LCP |
| 7 | Add a Lighthouse mobile CI check for the homepage that fails on LCP > 2.5s and TBT > 200 ms (there's already `.lighthouserc.mobile.json` — wire a mobile-only workflow if not running). | Very low | Prevents regressions from creeping in |

Explicitly **not** recommending: removing the hero video, disabling `.home-energy` motion, or restructuring sections. Nothing in the audit justifies it.

## 3. Assets / components needing attention

- `public/video/hero-sunset-road.mp4` — delete (orphan).
- `public/video/film/*`, `public/video/real/*` — audit references, delete unused.
- `src/components/home/CinematicHero.tsx` — swap the `<img>` fallback src to the 720 WebP; optionally add AV1/HEVC `<source>` above MP4.
- `src/assets/decision-signature.jpg`, `yes-mark-refined.png`, `yes-logo-approved.png` — compress / convert.
- `src/assets/tours/**/*.jpg` — batch through `vite-imagetools` for responsive WebP.
- `src/routes/index.tsx` + homepage section components under `src/components/home/` — add `loading="lazy" decoding="async"` to non-LCP `<img>`.
- `src/routes/__root.tsx` — sweep for any script tags to defer.
- `.github/workflows/lighthouse-home.yml` (mobile config exists) — verify it runs on PRs.

## 4. Complexity

- Fix #1 (delete orphans): **XS** — 1 grep, 1 rm.
- Fix #2 (poster `<img>` src): **XS** — 1 line.
- Fix #3 (lazy attrs): **S** — mechanical, ~10–15 files.
- Fix #4 (compress large bundled assets): **M** — needs `vite-imagetools` wiring + import updates.
- Fix #5 (AV1/HEVC): **M** — needs a build-time transcode step or pre-generated siblings.
- Fix #6 (script defer sweep): **S**.
- Fix #7 (CI Lighthouse mobile): **S**.

## 5. Sequence for max impact

1. **#1 — delete the 19 MB hero orphan + unused film/real directories** (biggest byte win, zero UX risk).
2. **#2 — swap poster `<img>` fallback to WebP-720** (biggest LCP win, one line).
3. **#3 — add lazy/async to below-the-fold `<img>`** (best CWV-per-hour, low risk).
4. **#4 — compress the three heavy bundled assets** (kills ~2 MB of unnecessary transfer).
5. **#7 — wire Lighthouse mobile CI** (locks in the gains).
6. **#5 — AV1/HEVC hero siblings** (last, requires transcode toolchain).
7. **#6 — script defer sweep** (do alongside #3).

## Risk

Overall **low.** Nothing above touches the hero video presence, the homepage design, or the premium motion system. All fixes are byte- or attribute-level.

Awaiting go-ahead — I'd start with steps 1 + 2 + 3 in a single batch.
